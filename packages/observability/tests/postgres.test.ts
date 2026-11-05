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
    expect(result).toEqual({ ok: true, reservationId: 'r', window: { tenant: 't', windowKey: '2026-10', spentUsd: 0.25, reservedUsd: 0.5, capUsd: 1, remainingUsd: 0.25, utilization: 0.75, resetsAt: '2026-11-01T00:00:00.000Z' } })
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

  it('expires overdue holds of the window before admitting, when reservationTtlMs is set', async () => {
    const { db, statements } = scripted([[{ reservations: '1' }], [{ spent_usd: '0', reserved_usd: '0.5' }]])
    const store = postgresCostStore({ db, now, reservationTtlMs: 15 * 60_000 })
    expect(await store.reserve({ tenant: 't', reservationId: 'next', amountUsd: 0.5, capUsd: 1 })).toMatchObject({ ok: true, window: { reservedUsd: 0.5, remainingUsd: 0.5 } })
    expect(statements).toHaveLength(2)
    expect(statements[0]).toContain("status = 'reserved' AND created_at < ")
    expect(statements[0]).toContain('2026-10-09T11:45:00.000Z')
    expect(statements[0]).toContain('AND tenant_id = ')
    expect(statements[0]).toContain('AND window_key = ')
    expect(statements[1]).toContain('ON CONFLICT (tenant_id, window_key) DO UPDATE')
    expect(statements[1]).toContain('2026-10-09T12:00:00.000Z')
  })

  it('rejects the late commit of an expired reservation and reads the returned balance', async () => {
    const { db, statements } = scripted([[{ reservations: 1 }], [], [{ window_key: 'w', status: 'released' }], [], [{ spent_usd: '0', reserved_usd: '0' }]])
    const store = postgresCostStore({ db, now, reservationTtlMs: 60_000 })
    await expect(store.commit({ tenant: 't', reservationId: 'dropped', actualUsd: 0.3 })).rejects.toMatchObject({ code: 'AK_COST_RESERVATION_RELEASED' })
    expect(statements[0]).toContain('AND reservation_id = ')
    expect(statements[0]).toContain('2026-10-09T11:59:00.000Z')
    expect(await store.window({ tenant: 't', windowKey: 'w', capUsd: 1 })).toMatchObject({ reservedUsd: 0, remainingUsd: 1 })
    expect(statements[3]).toContain("status = 'reserved' AND created_at < ")
  })

  it('rejects an invalid reservationTtlMs', () => {
    const { db } = scripted([])
    expect(() => postgresCostStore({ db, reservationTtlMs: -1 })).toThrow(/reservationTtlMs/)
  })

  it('reads the current window with the default monthly key', async () => {
    const { db } = scripted([[]])
    expect(await postgresCostStore({ db, now }).window({ tenant: 't', capUsd: 2 })).toEqual({ tenant: 't', windowKey: '2026-10', spentUsd: 0, reservedUsd: 0, capUsd: 2, remainingUsd: 2, utilization: 0, resetsAt: '2026-11-01T00:00:00.000Z' })
  })

  it('binds amounts as nano-dollar decimals, so the cap comparison has no float drift', async () => {
    const { db, statements } = scripted([[{ spent_usd: '0.100000000', reserved_usd: '0.200000000' }], [{ window_key: 'w', spent_usd: '0.300000000', reserved_usd: '0' }]])
    const store = postgresCostStore({ db, now })
    const reserved = await store.reserve({ tenant: 't', reservationId: 'r', amountUsd: 0.1 + 0.1, capUsd: 0.1 + 0.2, windowKey: 'w' })
    expect(reserved).toMatchObject({ ok: true, window: { remainingUsd: 0, utilization: 1 } })
    expect(statements[0]).toContain('"0.200000000"')
    expect(statements[0]).toContain('"0.300000000"')
    expect(statements[0]).not.toContain('0.30000000000000004')
    await store.commit({ tenant: 't', reservationId: 'r', actualUsd: 0.1 + 0.2, usage: [{ model: 'm', promptTokens: 1, completionTokens: 1, costUsd: 0.1 + 0.2 }] })
    expect(statements[1]).toContain('"0.300000000"')
    expect(statements[1]).toContain('\\"cost_usd\\":\\"0.300000000\\"')
  })

  it('reports the configured warning and the reset instant on every window it returns', async () => {
    const { db } = scripted([[{ spent_usd: '0.8', reserved_usd: '0' }], [{ spent_usd: '0.8', reserved_usd: '0' }]])
    const store = postgresCostStore({ db, now, warnAtUtilization: 0.8 })
    expect(await store.window({ tenant: 't', capUsd: 1 })).toEqual({
      tenant: 't', windowKey: '2026-10', spentUsd: 0.8, reservedUsd: 0, capUsd: 1, remainingUsd: 0.2, utilization: 0.8,
      warnAtUtilization: 0.8, warning: true, resetsAt: '2026-11-01T00:00:00.000Z',
    })
    expect(await store.window({ tenant: 't', capUsd: 1, warnAtUtilization: 0.9 })).toMatchObject({ warnAtUtilization: 0.9, warning: false })
    expect(() => postgresCostStore({ db, warnAtUtilization: Number.POSITIVE_INFINITY })).toThrow(/warnAtUtilization/)
  })
})
