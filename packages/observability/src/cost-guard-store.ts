import { recordCostSpend, warnProcessLocalCostState, type CostStore, type CostWindow } from './cost-store'

type StoreErrorHandler = (error: unknown) => void | Promise<void>

/** Durable accounting shared by `costGuard`, `multiTenantCostGuard` and `createAdvancedCostGuard`. */
export interface CostGuardStoreOptions {
  /**
   * Durable store that receives every priced call. With it, the budget is checked
   * against spend recorded by all instances in the store's current window; without
   * it, totals live in process memory (development only; warns in production).
   */
  store?: CostStore
  /**
   * Controls the warning for a guard that runs without a `store`. By default it
   * warns when `NODE_ENV` is `production`, and on Cloudflare Workers when
   * `NODE_ENV` is not set. `true` always warns; `false` silences it.
   */
  warnWithoutStore?: boolean
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
 * failures go to `report` and never escape the observer. A guard without an
 * `onError` handler warns once on the first failure, so a store that stops
 * recording is not silent.
 * @param scope Guard name used in the warnings.
 * @param options The guard's `store`, `warnWithoutStore` and `onError`.
 * @param report Isolated error reporter of the guard.
 * @returns The recorder, or `undefined` when no store is configured.
 */
export function durableSpendRecorder(
  scope: string,
  options: CostGuardStoreOptions & { onError?: StoreErrorHandler },
  report: (error: unknown) => void,
): DurableSpendRecorder | undefined {
  const { store } = options
  if (!store) {
    warnProcessLocalCostState(scope, options.warnWithoutStore)
    return undefined
  }
  let warned = false
  const failed = (error: unknown): void => {
    if (!options.onError && !warned) {
      warned = true
      console.warn(`[agentskit] ${scope}: writing to the CostStore failed (${error instanceof Error ? error.message : String(error)}). This spend was not recorded durably and later failures will not be logged. Pass \`onError\` to handle them.`)
    }
    report(error)
  }
  return ({ tenant, model = 'unknown', promptTokens, completionTokens, costUsd }, onWindow) => {
    void recordCostSpend(store, { tenant, costUsd, usage: [{ model, promptTokens, completionTokens, costUsd }] })
      .then(onWindow).then(undefined, failed)
  }
}
