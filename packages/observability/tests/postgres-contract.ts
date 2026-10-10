import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { costStoreContract, type CostStoreContractResult } from '@agentskit/observability/cost-store-contract'
import { postgresCostMigrationSql, postgresCostStore } from '@agentskit/observability/postgres'

export interface PostgresCostContractResult extends CostStoreContractResult {
  ledger: 'passed'
  replayRace: 'passed'
}

/** Shared by the Node pool test and the workerd fixture; imports the built package. */
export async function postgresCostContract(db: NodePgDatabase, tenantPrefix: string): Promise<PostgresCostContractResult> {
  await db.execute(sql.raw(postgresCostMigrationSql))
  await db.execute(sql.raw(postgresCostMigrationSql))
  const store = postgresCostStore({ db })
  const contract = await costStoreContract(store, { tenantPrefix })

  const ledger = await db.execute(sql`SELECT model, prompt_tokens, completion_tokens, cost_usd, source, fallback
    FROM agentskit_usage_ledger WHERE tenant_id = ${`${tenantPrefix}:accounting`}`)
  const [row] = ledger.rows as Record<string, unknown>[]
  if (ledger.rows.length !== 1 || row?.model !== 'contract-model' || Number(row.prompt_tokens) !== 100 || Number(row.cost_usd) !== 0.25 || row.source !== 'contract' || row.fallback !== true) {
    throw new Error('usage ledger row does not match the committed usage')
  }
  const totals = await db.execute(sql`SELECT count(*)::int AS rows, sum(cost_usd)::float8 AS cost FROM agentskit_usage_ledger WHERE tenant_id = ${`${tenantPrefix}:release`}`)
  const spent = (await store.window({ tenant: `${tenantPrefix}:release`, windowKey: 'contract' })).spentUsd
  const total = totals.rows[0] as { rows: number; cost: number }
  if (total.rows !== 80 || Math.abs(total.cost - spent) > 1e-9) throw new Error(`ledger total ${total.cost} over ${total.rows} rows does not match the window ${spent}`)

  const tenant = `${tenantPrefix}:replay-race`
  for (let round = 0; round < 20; round++) {
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      store.reserve({ tenant, reservationId: `round-${round}`, amountUsd: 0.01, capUsd: 1, windowKey: 'contract' })))
    if (!results.every(result => result.ok)) throw new Error('concurrent replay of one reservation id must succeed')
  }
  const raced = await store.window({ tenant, windowKey: 'contract' })
  if (Math.abs(raced.reservedUsd - 0.2) > 1e-9) throw new Error(`replayed reservations were counted more than once (${raced.reservedUsd})`)

  return { ...contract, ledger: 'passed', replayRace: 'passed' }
}
