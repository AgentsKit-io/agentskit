import type { CostStore, CostUsageEntry, CostWindow } from './cost-store'

/** Spend that already happened and must be written to a `CostStore` by an observer. */
export interface CostSpendRecord {
  tenant: string
  costUsd: number
  usage?: readonly CostUsageEntry[]
}

/**
 * Record spend that already happened: reserve it without a ceiling, then commit
 * it, and return the resulting window. Cost guards use this after each priced call.
 * When the commit fails, the hold is released before the error is rethrown, so a
 * failed write does not leave the amount reserved.
 */
export async function recordCostSpend(store: CostStore, record: CostSpendRecord): Promise<CostWindow> {
  const reservationId = `spend-${globalThis.crypto.randomUUID()}`
  await store.reserve({ tenant: record.tenant, reservationId, amountUsd: record.costUsd })
  try {
    return await store.commit({ tenant: record.tenant, reservationId, actualUsd: record.costUsd, usage: record.usage })
  } catch (error) {
    // Best effort: when the store is unreachable the release fails too, and the reservation is left for `reservationTtlMs`.
    await store.release({ tenant: record.tenant, reservationId }).catch(() => {})
    throw error
  }
}

const warned = new Set<string>()

/** True for `NODE_ENV=production`, and for Cloudflare Workers when `NODE_ENV` is not set (isolates expose no `process.env` by default). */
function looksLikeProduction(): boolean {
  const scope = globalThis as { process?: { env?: Record<string, string | undefined> }; navigator?: { userAgent?: string } }
  const nodeEnv = scope.process?.env?.NODE_ENV
  if (nodeEnv !== undefined) return nodeEnv === 'production'
  return scope.navigator?.userAgent === 'Cloudflare-Workers'
}

/**
 * Warn once per guard when it runs without a `CostStore`: its totals then live
 * in process memory and do not hold across instances.
 * @param scope Guard name used in the message.
 * @param warn `true` always warns, `false` never does; by default it warns in production runtimes.
 */
export function warnProcessLocalCostState(scope: string, warn?: boolean): void {
  if (!(warn ?? looksLikeProduction()) || warned.has(scope)) return
  warned.add(scope)
  console.warn(`[agentskit] ${scope}: no CostStore configured. Spend is tracked in process memory, so budgets reset on restart and are not shared between instances or isolates. Pass a durable \`store\`.`)
}
