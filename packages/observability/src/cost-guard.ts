import { ConfigError, ErrorCodes, type AgentEvent, type Observer } from '@agentskit/core'

/**
 * Dollar cost per 1K tokens for input and output.
 */
export interface TokenPrice {
  input: number
  output: number
}

/** Isolated error reporter shared by all cost guards. */
export type CostGuardErrorHandler = (error: unknown) => void | Promise<void>

/**
 * Pricing registry keyed by model name (case-insensitive prefix match).
 * Ordered: longest prefix wins so `gpt-4o-mini` matches before `gpt-4o`.
 *
 * Baseline as of late 2025 — keep in sync with provider docs or override
 * via the `prices` option.
 */
export const DEFAULT_PRICES: Record<string, TokenPrice> = {
  // OpenAI
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'o1-preview': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 },
  'o1': { input: 0.015, output: 0.06 },
  'o3-mini': { input: 0.0011, output: 0.0044 },
  'o3': { input: 0.002, output: 0.008 },
  // Anthropic
  'claude-opus-4-6': { input: 0.015, output: 0.075 },
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5': { input: 0.0008, output: 0.004 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
  // Gemini
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  // Ollama / local models — free at inference time
  'ollama': { input: 0, output: 0 },
}

export interface CostGuardOptions {
  /** Hard budget in USD. Aborts the run when exceeded. */
  budgetUsd: number
  /**
   * AbortController to signal the runtime to stop. The runtime picks
   * this up via RunOptions.signal (RT13).
   */
  controller: AbortController
  /**
   * Optional price table override. Partial — merged over DEFAULT_PRICES.
   */
  prices?: Record<string, TokenPrice>
  /**
   * Called whenever the running total changes. Useful for progress UI.
   * Sync throws and async rejections are isolated.
   */
  onCost?: (info: {
    costUsd: number
    promptTokens: number
    completionTokens: number
    budgetRemainingUsd: number
  }) => void | Promise<void>
  /**
   * Called when the budget is exceeded (just before / after abort bookkeeping).
   * Sync throws and async rejections are isolated.
   */
  onExceeded?: (info: { costUsd: number; budgetUsd: number }) => void | Promise<void>
  /** Isolated sink for internal / callback failures. Never allowed to escape. */
  onError?: CostGuardErrorHandler
  /** Force a specific model id if the runtime doesn't emit one. */
  modelOverride?: string
  /** Observer name for tracing. */
  name?: string
}

/** Coerce hostile token counts (NaN / Infinity / negative / non-number) to 0. */
export function normalizeTokenCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0
  return value
}

/**
 * Look up the best price match for a model id. Prefix match — 'gpt-4o-mini'
 * matches its own entry before 'gpt-4o'. Returns { input: 0, output: 0 }
 * (free) for unknown models plus a console warning once.
 */
export function priceFor(
  model: string | undefined,
  prices: Record<string, TokenPrice> = DEFAULT_PRICES,
): TokenPrice {
  if (!model) return { input: 0, output: 0 }

  const keys = Object.keys(prices).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (model.toLowerCase().startsWith(key.toLowerCase())) return prices[key]!
  }
  return { input: 0, output: 0 }
}

/**
 * Compute dollar cost from a usage record plus a price record.
 * Hostile token counts are normalized to zero so NaN never poisons totals.
 */
export function computeCost(
  usage: { promptTokens: number; completionTokens: number },
  price: TokenPrice,
): number {
  const promptTokens = normalizeTokenCount(usage.promptTokens)
  const completionTokens = normalizeTokenCount(usage.completionTokens)
  return (promptTokens / 1000) * price.input + (completionTokens / 1000) * price.output
}

/** Report an error through onError without ever escaping or generating unhandledRejection. */
export function reportCostGuardError(
  onError: CostGuardErrorHandler | undefined,
  error: unknown,
): void {
  if (!onError) return
  try {
    const result = onError(error)
    if (result != null && typeof (result as PromiseLike<void>).then === 'function') {
      void Promise.resolve(result).then(undefined, () => {})
    }
  } catch {
    // onError must never escape
  }
}

/**
 * Invoke a user callback, isolating sync throws and async rejections.
 * Failures are forwarded to onError (also isolated).
 */
export function invokeCostGuardCallback(
  fn: (() => void | Promise<void>) | undefined,
  onError: CostGuardErrorHandler | undefined,
): void {
  if (!fn) return
  try {
    const result = fn()
    if (result != null && typeof (result as PromiseLike<void>).then === 'function') {
      void Promise.resolve(result).then(undefined, (err: unknown) => {
        reportCostGuardError(onError, err)
      })
    }
  } catch (err) {
    reportCostGuardError(onError, err)
  }
}

export function assertFiniteNonNegative(
  scope: string,
  name: string,
  value: number,
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${scope}: ${name} must be a finite number ≥ 0 (received ${String(value)})`,
      hint: 'Pass finite non-negative numbers for budgets and token prices.',
    })
  }
}

export function assertFinitePositive(
  scope: string,
  name: string,
  value: number,
): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${scope}: ${name} must be a finite positive number (received ${String(value)})`,
      hint: 'Pass a finite value > 0 for window lengths and throttle intervals.',
    })
  }
}

export function validateTokenPrices(
  scope: string,
  prices: Record<string, TokenPrice> | undefined,
): void {
  if (!prices) return
  for (const [model, price] of Object.entries(prices)) {
    assertFiniteNonNegative(scope, `prices['${model}'].input`, price.input)
    assertFiniteNonNegative(scope, `prices['${model}'].output`, price.output)
  }
}

/**
 * Finite utilization for alerts/callbacks. Zero budget + positive spend uses
 * sentinel `1` so payloads stay JSON-serializable (never Infinity).
 */
export function finiteUtilization(costUsd: number, budgetUsd: number): number {
  if (budgetUsd > 0) {
    const u = costUsd / budgetUsd
    return Number.isFinite(u) ? u : 1
  }
  return costUsd > 0 ? 1 : 0
}

/**
 * A `cost-guarded` observer. Tracks token usage from llm:end events,
 * computes running cost incrementally per active model, aborts the run
 * when the budget is exceeded.
 */
export function costGuard(options: CostGuardOptions): Observer & {
  /** Total cost so far, in USD. */
  costUsd: () => number
  /** Cumulative prompt tokens seen. */
  promptTokens: () => number
  /** Cumulative completion tokens seen. */
  completionTokens: () => number
  /** Whether the budget has already been exceeded. */
  exceeded: () => boolean
  /** Reset the internal counters. */
  reset: () => void
} {
  assertFiniteNonNegative('costGuard', 'budgetUsd', options.budgetUsd)
  validateTokenPrices('costGuard', options.prices)

  const { budgetUsd, controller, prices, onCost, onExceeded, onError, modelOverride } = options
  const mergedPrices = prices ? { ...DEFAULT_PRICES, ...prices } : DEFAULT_PRICES

  let currentModel: string | undefined = modelOverride
  let prompt = 0
  let completion = 0
  let cost = 0
  let exceededOnce = false

  const update = (deltaPrompt: number, deltaCompletion: number) => {
    prompt += deltaPrompt
    completion += deltaCompletion
    const price = priceFor(currentModel, mergedPrices)
    // Incremental: price only the tokens from this event with the active model.
    cost += computeCost(
      { promptTokens: deltaPrompt, completionTokens: deltaCompletion },
      price,
    )

    invokeCostGuardCallback(() => {
      return onCost?.({
        costUsd: cost,
        promptTokens: prompt,
        completionTokens: completion,
        budgetRemainingUsd: Math.max(0, budgetUsd - cost),
      })
    }, onError)

    if (cost > budgetUsd && !exceededOnce) {
      // Mark + abort synchronously before any potentially hostile onExceeded.
      exceededOnce = true
      try {
        controller.abort()
      } catch (err) {
        reportCostGuardError(onError, err)
      }
      invokeCostGuardCallback(() => {
        return onExceeded?.({ costUsd: cost, budgetUsd })
      }, onError)
    }
  }

  return {
    name: options.name ?? 'cost-guard',
    on(event: AgentEvent) {
      switch (event.type) {
        case 'llm:start':
          if (event.model && !modelOverride) currentModel = event.model
          break
        case 'llm:end':
          if (event.usage) {
            const deltaPrompt = normalizeTokenCount(event.usage.promptTokens)
            const deltaCompletion = normalizeTokenCount(event.usage.completionTokens)
            update(deltaPrompt, deltaCompletion)
          }
          break
      }
    },
    costUsd: () => cost,
    promptTokens: () => prompt,
    completionTokens: () => completion,
    exceeded: () => exceededOnce,
    reset: () => {
      prompt = 0
      completion = 0
      cost = 0
      exceededOnce = false
    },
  }
}
