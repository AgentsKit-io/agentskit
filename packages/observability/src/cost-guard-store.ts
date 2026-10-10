import { recordCostSpend, warnProcessLocalCostState, type CostStore, type CostWindow } from './cost-store'

/** Durable accounting shared by `costGuard`, `multiTenantCostGuard` and `createAdvancedCostGuard`. */
export interface CostGuardStoreOptions {
  /**
   * Durable store that receives every priced call. With it, the budget is checked
   * against spend recorded by all instances in the store's current window; without
   * it, totals live in process memory (development only; warns in production).
   */
  store?: CostStore
}

/** One priced `llm:end` event, as a guard sees it. */
export interface PricedCall {
  tenant: string
  model: string | undefined
  promptTokens: number
  completionTokens: number
  costUsd: number
}

/** Writes one priced call and hands the resulting durable window to the guard. */
export type DurableSpendRecorder = (call: PricedCall, onWindow: (window: CostWindow) => void) => void

/**
 * Build the recorder a guard calls after pricing an `llm:end` event. Store
 * failures go to `report` and never escape the observer.
 * @param scope Guard name used in the production warning.
 * @param store Durable store, or `undefined` to keep process-local totals.
 * @param report Isolated error reporter of the guard.
 * @returns The recorder, or `undefined` when no store is configured.
 */
export function durableSpendRecorder(
  scope: string,
  store: CostStore | undefined,
  report: (error: unknown) => void,
): DurableSpendRecorder | undefined {
  if (!store) {
    warnProcessLocalCostState(scope)
    return undefined
  }
  return ({ tenant, model = 'unknown', promptTokens, completionTokens, costUsd }, onWindow) => {
    void recordCostSpend(store, { tenant, costUsd, usage: [{ model, promptTokens, completionTokens, costUsd }] })
      .then(onWindow).then(undefined, report)
  }
}
