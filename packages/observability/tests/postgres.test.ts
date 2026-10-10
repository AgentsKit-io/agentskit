import { describe, expect, it } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { expirePostgresCostReservations, postgresCostMigrationSql, postgresCostReservationTable, postgresCostStore, postgresCostWindowTable, postgresUsageLedgerTable } from '../src/postgres'

type Rows = Record<string, unknown>[]
type Db = Parameters<typeof postgresCostStore>[0]['db']

/** Scripted `db.execute`: each call shifts the next result or throws the next error. */
function scripted(steps: (Rows | Error)[]) {
  const statements: string[] = []
  const db = {
    execute: async (query: { queryChunks?: unknown[] }) => {
      statements.push(JSON.stringify(query.queryChunks))
      const step = steps.shift()
      if (!step) throw new Error('unexpected statement')
      if (step instanceof Error) throw step
      return { rows: step }
    },
  } as unknown as Db
  return { db, statements }
}

const now = () => new Date('2026-10-09T12:00:00Z')

describe('postgresCostStore', () => {
  it('exports schema and idempotent DDL for the three tables', () => {
    expect(postgresCostMigrationSql.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(3)
    expect([postgresCostWindowTable, postgresCostReservationTable, postgresUsageLedgerTable].map(table => Object.keys(table).length > 0)).toEqual([true, true, true])
  })

  it('keeps the Drizzle schema aligned with the DDL constraints', () => {
    expect(getTableConfig(postgresCostReservationTable).checks.map(constraint => constraint.name)).toEqual(['agentskit_cost_reservation_status_check'])
    expect(getTableConfig(postgresUsageLedgerTable).indexes.map(entry => entry.config.name)).toEqual(['agentskit_usage_ledger_tenant_created'])
    expect(postgresUsageLedgerTable.promptTokens.getSQLType()).toBe('bigint')
    expect(postgresCostMigrationSql).toContain('prompt_tokens bigint NOT NULL')
    expect(postgresCostMigrationSql).toContain('completion_tokens bigint NOT NULL')
  })

  it('admits a reservation from the single atomic statement', async () => {
    const { db, statements } = scripted([[{ spent_usd: '0.250000000', reserved_usd: '0.500000000' }]])
    const result = await postgresCostStore({ db, now }).reserve({ tenant: 't', reservationId: 'r', amountUsd: 0.5, capUsd: 1 })
    expect(result).toEqual({ ok: true, reservationId: 'r', window: { tenant: 't', windowKey: '2026-10', spentUsd: 0.25, reservedUsd: 0.5, capUsd: 1, remainingUsd: 0.25, utilization: 0.75 } })
    expect(statements).toHaveLength(1)
    expect(statements[0]).toContain('ON CONFLICT (tenant_id, window_key) DO UPDATE')
  })

  it('reports quota_exceeded with the current window when nothing was admitted', async () => {
    const { db } = scripted([[], [], [{ spent_usd: '0.9', reserved_usd: '0.1' }]])
    const result = await postgresCostStore({ db, now }).reserve({ tenant: 't', reservationId: 'r', amountUsd: 0.5, capUsd: 1 })
    expect(result).toMatchObject({ ok: false, reason: 'quota_exceeded', window: { spentUsd: 0.9, reservedUsd: 0.1, remainingUsd: 0 } })
  })

  it('replays an existing reservation, including one that lost a concurrent insert', async () => {
    const conflict = Object.assign(new Error('query failed'), { cause: Object.assign(new Error('duplicate key'), { code: '23505' }) })
    const { db } = scripted([conflict, [{ window_key: '2026-09' }], [{ spent_usd: '0', reserved_usd: '0.5' }]])
    const result = await postgresCostStore({ db, now }).reserve({ tenant: 't', reservationId: 'r', amountUsd: 0.5 })
    expect(result).toMatchObject({ ok: true, window: { windowKey: '2026-09', reservedUsd: 0.5 } })
  })

  it('rejects a released reservation id instead of replaying it as admitted', async () => {
    const { db } = scripted([[], [{ window_key: '2026-09', status: 'released' }]])
    await expect(postgresCostStore({ db, now }).reserve({ tenant: 't', reservationId: 'r', amountUsd: 0.5 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_RELEASED' })
  })

  it('validates release and window inputs before any statement', async () => {
    const { db, statements } = scripted([])
    const store = postgresCostStore({ db, now })
    await expect(store.release({ tenant: ' ', reservationId: 'r' })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    await expect(store.release({ tenant: 't', reservationId: '' })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    await expect(store.window({ tenant: '' })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    await expect(store.window({ tenant: 't', capUsd: Number.NaN })).rejects.toMatchObject({ code: 'AK_CONFIG_INVALID' })
    expect(statements).toHaveLength(0)
  })

  it('expires abandoned reservations in one statement and counts them', async () => {
    const { db, statements } = scripted([[{ reservations: '2' }, { reservations: 3 }], []])
    expect(await expirePostgresCostReservations({ db, olderThan: new Date('2026-10-09T11:00:00Z') })).toBe(5)
    expect(statements[0]).toContain("status = 'reserved' AND created_at < ")
    expect(statements[0]).toContain('2026-10-09T11:00:00.000Z')
    expect(await expirePostgresCostReservations({ db, olderThan: new Date(0) })).toBe(0)
  })

  it('propagates database errors that are not a replay', async () => {
    const { db } = scripted([new Error('connection reset')])
    await expect(postgresCostStore({ db, now }).reserve({ tenant: 't', reservationId: 'r', amountUsd: 0.5 })).rejects.toThrow('connection reset')
  })

  it('commits once and maps settled reservations to typed outcomes', async () => {
    const usage = [{ model: 'm', promptTokens: 10.4, completionTokens: 2, costUsd: 0.3 }]
    const first = scripted([[{ window_key: 'w', spent_usd: '0.3', reserved_usd: '0' }]])
    expect(await postgresCostStore({ db: first.db }).commit({ tenant: 't', reservationId: 'r', actualUsd: 0.3, usage })).toEqual({ tenant: 't', windowKey: 'w', spentUsd: 0.3, reservedUsd: 0 })
    expect(first.statements[0]).toContain('\\"prompt_tokens\\":10')

    const replay = scripted([[], [{ window_key: 'w', status: 'committed' }], [{ spent_usd: '0.3', reserved_usd: '0' }]])
    expect(await postgresCostStore({ db: replay.db }).commit({ tenant: 't', reservationId: 'r', actualUsd: 0.3 })).toMatchObject({ spentUsd: 0.3 })

    const released = scripted([[], [{ window_key: 'w', status: 'released' }]])
    await expect(postgresCostStore({ db: released.db }).commit({ tenant: 't', reservationId: 'r', actualUsd: 0.3 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_RELEASED' })

    const missing = scripted([[], []])
    await expect(postgresCostStore({ db: missing.db }).commit({ tenant: 't', reservationId: 'r', actualUsd: 0.3 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_NOT_FOUND' })
  })

  it('releases once and rejects a committed reservation', async () => {
    const first = scripted([[{ window_key: 'w', spent_usd: '0', reserved_usd: '0' }]])
    expect(await postgresCostStore({ db: first.db }).release({ tenant: 't', reservationId: 'r' })).toMatchObject({ reservedUsd: 0 })
    const replay = scripted([[], [{ window_key: 'w', status: 'released' }], []])
    expect(await postgresCostStore({ db: replay.db }).release({ tenant: 't', reservationId: 'r' })).toEqual({ tenant: 't', windowKey: 'w', spentUsd: 0, reservedUsd: 0 })
    const committed = scripted([[], [{ window_key: 'w', status: 'committed' }]])
    await expect(postgresCostStore({ db: committed.db }).release({ tenant: 't', reservationId: 'r' })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_COMMITTED' })
  })

  it('reads the current window with the default monthly key', async () => {
    const { db } = scripted([[]])
    expect(await postgresCostStore({ db, now }).window({ tenant: 't', capUsd: 2 })).toEqual({ tenant: 't', windowKey: '2026-10', spentUsd: 0, reservedUsd: 0, capUsd: 2, remainingUsd: 2, utilization: 0 })
  })
})
