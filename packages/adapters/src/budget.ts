import { AdapterError, ConfigError, ErrorCodes, approximateCounter } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource, TokenCounter, TokenUsage } from '@agentskit/core'

/** Stable error code carried by {@link BudgetExceededError}. */
export const AK_BUDGET_EXCEEDED = 'AK_BUDGET_EXCEEDED'

/** USD per 1M tokens, the same unit as the model catalog `cost` field. */
export interface BudgetPrice {
  input: number
  output: number
}

/** Details of a refused call. */
export interface BudgetExceededDetails {
  /** `call` = the per-call ceiling fired; `budget` = the named budget fired. */
  scope: 'call' | 'budget'
  /** Named budget, when `scope` is `budget`. */
  budget?: string
  /** Ceiling that fired (USD). */
  limitUsd: number
  /** Worst-case cost estimated for the refused call (USD). */
  estimatedUsd: number
  /** Spent plus in-flight reservations on the named budget (USD). */
  spentUsd?: number
}

/**
 * Typed refusal raised before the model is called. The wrapped adapter is
 * never invoked when this error is emitted.
 */
export class BudgetExceededError extends AdapterError {
  readonly scope: BudgetExceededDetails['scope']
  readonly budget: string | undefined
  readonly limitUsd: number
  readonly estimatedUsd: number
  readonly spentUsd: number | undefined

  constructor(details: BudgetExceededDetails) {
    super({
      code: AK_BUDGET_EXCEEDED,
      message: details.scope === 'call'
        ? `Call refused: estimated $${fmt(details.estimatedUsd)} exceeds the per-call ceiling of $${fmt(details.limitUsd)}`
        : `Call refused: budget "${details.budget}" has $${fmt(details.spentUsd ?? 0)} of $${fmt(details.limitUsd)} used; this call needs up to $${fmt(details.estimatedUsd)}`,
      hint: 'Lower context.maxTokens, shorten the prompt, or raise the ceiling.',
    })
    this.name = 'BudgetExceededError'
    this.scope = details.scope
    this.budget = details.budget
    this.limitUsd = details.limitUsd
    this.estimatedUsd = details.estimatedUsd
    this.spentUsd = details.spentUsd
  }
}

function fmt(usd: number): string {
  return usd.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')
}

/** Accepted reservation; settle it with the actual cost once the call ends. */
export interface BudgetReservation {
  settle: (actualUsd: number) => void | Promise<void>
}

/** Result of a reservation attempt. */
export type BudgetReserveResult =
  | { ok: true; reservation: BudgetReservation }
  | { ok: false; limitUsd: number; spentUsd: number }

/**
 * Shared spend ledger for named budgets (one name per customer or user).
 * Implement it over Redis or a database to share spend across processes.
 */
export interface BudgetLedger {
  reserve: (budget: string, estimatedUsd: number) => BudgetReserveResult | Promise<BudgetReserveResult>
}

/** Limits for the in-memory ledger. */
export interface MemoryBudgetLedgerOptions {
  /** USD limit per named budget. */
  limits?: Record<string, number>
  /** Limit for names not listed in `limits`. Omit to leave them unmetered. */
  defaultLimitUsd?: number
}

/** In-memory ledger with inspection helpers. */
export interface MemoryBudgetLedger extends BudgetLedger {
  spentUsd: (budget: string) => number
  remainingUsd: (budget: string) => number | undefined
  setLimit: (budget: string, limitUsd: number | undefined) => void
  reset: (budget?: string) => void
}

function assertUsd(field: string, value: number | undefined): void {
  if (value === undefined) return
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${field} must be a finite, non-negative number`,
    })
  }
}

/**
 * Create an in-process ledger. In-flight calls hold their estimate as a
 * reservation, so concurrent calls cannot jointly overrun a budget.
 */
export function createBudgetLedger(options: MemoryBudgetLedgerOptions = {}): MemoryBudgetLedger {
  const limits = new Map<string, number | undefined>()
  for (const [name, limit] of Object.entries(options.limits ?? {})) {
    assertUsd(`limits['${name}']`, limit)
    limits.set(name, limit)
  }
  assertUsd('defaultLimitUsd', options.defaultLimitUsd)
  const spent = new Map<string, number>()
  const reserved = new Map<string, number>()
  const limitOf = (name: string) => limits.has(name) ? limits.get(name) : options.defaultLimitUsd
  const add = (map: Map<string, number>, name: string, usd: number) => map.set(name, Math.max(0, (map.get(name) ?? 0) + usd))

  return {
    reserve(budget, estimatedUsd) {
      const limitUsd = limitOf(budget)
      const used = (spent.get(budget) ?? 0) + (reserved.get(budget) ?? 0)
      if (limitUsd !== undefined && used + estimatedUsd > limitUsd) return { ok: false, limitUsd, spentUsd: used }
      add(reserved, budget, estimatedUsd)
      let settled = false
      return {
        ok: true,
        reservation: {
          settle(actualUsd) {
            if (settled) return
            settled = true
            add(reserved, budget, -estimatedUsd)
            add(spent, budget, actualUsd)
          },
        },
      }
    },
    spentUsd: budget => spent.get(budget) ?? 0,
    remainingUsd(budget) {
      const limitUsd = limitOf(budget)
      return limitUsd === undefined ? undefined : Math.max(0, limitUsd - (spent.get(budget) ?? 0) - (reserved.get(budget) ?? 0))
    },
    setLimit(budget, limitUsd) {
      assertUsd(`limits['${budget}']`, limitUsd)
      limits.set(budget, limitUsd)
    },
    reset(budget) {
      if (budget === undefined) {
        spent.clear()
        return
      }
      spent.delete(budget)
    },
  }
}

/** Per-call overrides read from `request.context.metadata.budget`. */
export interface BudgetCallMetadata {
  /** Named budget to charge (e.g. `customer:acme`). */
  name?: string
  /** Per-call ceiling in USD. Can only lower the configured ceiling. */
  maxCallUsd?: number
}

/** Options for {@link withBudget}. */
export interface WithBudgetOptions {
  /** Price of the wrapped model in USD per 1M tokens. */
  price: BudgetPrice
  /** Default per-call ceiling (USD). */
  maxCallUsd?: number
  /** Default named budget, or a resolver from the request. */
  budget?: string | ((request: AdapterRequest) => string | undefined)
  /** Ledger holding named budgets. Required when a named budget is used. */
  ledger?: BudgetLedger
  /**
   * Output tokens assumed when the request sets no `context.maxTokens`.
   * Default 0 (prompt-only estimate); set it to your provider's output cap
   * for a true worst-case bound.
   */
  maxOutputTokens?: number
  /** Prompt token counter. Default: core's chars/4 approximation. */
  counter?: TokenCounter
}

/** Cost in USD of the given token counts. */
export function estimateCostUsd(price: BudgetPrice, promptTokens: number, completionTokens: number): number {
  return (promptTokens * price.input + completionTokens * price.output) / 1_000_000
}

function callMetadata(request: AdapterRequest): BudgetCallMetadata {
  const raw = request.context?.metadata?.budget
  if (typeof raw === 'string') return { name: raw }
  if (!raw || typeof raw !== 'object') return {}
  const { name, maxCallUsd } = raw as Record<string, unknown>
  return {
    name: typeof name === 'string' ? name : undefined,
    maxCallUsd: isUsd(maxCallUsd) ? maxCallUsd : undefined,
  }
}

function isUsd(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** The lower of two optional ceilings; a per-call value can only tighten. */
function tighter(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return Math.min(a, b)
}

async function promptTokens(request: AdapterRequest, counter: TokenCounter): Promise<number> {
  const messages = request.context?.systemPrompt
    ? [{ role: 'system' as const, content: request.context.systemPrompt }, ...request.messages]
    : request.messages
  let tokens = await counter.count(messages)
  for (const tool of request.context?.tools ?? []) {
    tokens += Math.ceil(JSON.stringify({ name: tool.name, description: tool.description, schema: tool.schema }).length / 4)
  }
  return tokens
}

function usageOf(chunk: StreamChunk): TokenUsage | undefined {
  if (chunk.usage) return chunk.usage
  const meta = chunk.metadata?.usage as Partial<TokenUsage> | undefined
  if (meta && (typeof meta.promptTokens === 'number' || typeof meta.completionTokens === 'number')) {
    const p = meta.promptTokens ?? 0
    const c = meta.completionTokens ?? 0
    return { promptTokens: p, completionTokens: c, totalTokens: meta.totalTokens ?? p + c }
  }
  return undefined
}

/**
 * Wrap an adapter with a per-call ceiling and a named budget. Before the
 * wrapped model is called, the worst-case cost (prompt estimate plus
 * `maxTokens` of output) is checked; when it overruns, the stream emits one
 * `error` chunk carrying a {@link BudgetExceededError} and the model is never
 * called. After the call, reported usage (or the estimate when the provider
 * reports none) is charged to the named budget.
 *
 * Per call, `request.context.metadata.budget` may override the name and the
 * ceiling: `{ name: 'customer:acme', maxCallUsd: 0.02 }` or just a name.
 * The per-call `maxCallUsd` can only lower the configured ceiling, never
 * raise it; a non-finite or negative value is ignored.
 */
export function withBudget(adapter: AdapterFactory, options: WithBudgetOptions): AdapterFactory {
  assertUsd('price.input', options.price?.input)
  assertUsd('price.output', options.price?.output)
  if (options.price?.input === undefined || options.price.output === undefined) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'withBudget requires price.input and price.output (USD per 1M tokens)' })
  }
  assertUsd('maxCallUsd', options.maxCallUsd)
  assertUsd('maxOutputTokens', options.maxOutputTokens)
  if (typeof options.budget === 'string' && !options.ledger) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: `withBudget: budget "${options.budget}" requires a ledger` })
  }
  const counter = options.counter ?? approximateCounter

  return {
    ...(adapter.capabilities ? { capabilities: adapter.capabilities } : {}),
    createSource(request): StreamSource {
      let inner: StreamSource | undefined
      let aborted = false
      return {
        abort() {
          aborted = true
          inner?.abort()
        },
        stream: async function* () {
          const meta = callMetadata(request)
          const name = meta.name ?? (typeof options.budget === 'function' ? options.budget(request) : options.budget)
          const maxCallUsd = tighter(meta.maxCallUsd, options.maxCallUsd)
          const outputTokens = request.context?.maxTokens ?? options.maxOutputTokens ?? 0
          const estimatedUsd = estimateCostUsd(options.price, await promptTokens(request, counter), outputTokens)

          const refuse = (details: BudgetExceededDetails): StreamChunk => {
            const error = new BudgetExceededError(details)
            return { type: 'error', content: error.message, metadata: { error } }
          }

          if (maxCallUsd !== undefined && estimatedUsd > maxCallUsd) {
            yield refuse({ scope: 'call', limitUsd: maxCallUsd, estimatedUsd })
            return
          }

          let reservation: BudgetReservation | undefined
          if (name !== undefined) {
            if (!options.ledger) {
              const error = new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: `withBudget: budget "${name}" requires a ledger` })
              yield { type: 'error', content: error.message, metadata: { error } }
              return
            }
            const result = await options.ledger.reserve(name, estimatedUsd)
            if (!result.ok) {
              yield refuse({ scope: 'budget', budget: name, limitUsd: result.limitUsd, estimatedUsd, spentUsd: result.spentUsd })
              return
            }
            reservation = result.reservation
          }
          if (aborted) {
            await reservation?.settle(0)
            return
          }

          let usage: TokenUsage | undefined
          let produced = false
          try {
            inner = adapter.createSource(request)
            for await (const chunk of inner.stream()) {
              const reported = usageOf(chunk)
              if (reported) usage = reported
              if (chunk.type !== 'error' && chunk.type !== 'done') produced = true
              yield chunk
            }
          } finally {
            let actualUsd = produced ? estimatedUsd : 0
            if (usage) {
              actualUsd = estimateCostUsd(options.price, usage.promptTokens, usage.completionTokens)
            }
            await reservation?.settle(actualUsd)
          }
        },
      }
    },
  }
}
