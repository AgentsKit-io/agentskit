import { AgentsKitError, ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource, TokenUsage } from '@agentskit/core'
import { anthropic } from './anthropic'
import { openai } from './openai'
import { openaiCompatible } from './openai-compatible'
import type { RetryOptions } from './utils'

/** Providers reachable through the single gateway. */
export type GatewayProvider = 'openrouter' | 'anthropic' | 'openai' | 'cliproxyapi'

/** USD per one million tokens. Same shape as the catalog's `CatalogModelCost`. */
export interface GatewayPricing {
  input: number
  output: number
}

/** A named spending allowance in USD, shareable across gateways (e.g. one per client). */
export interface CostBudget {
  readonly name: string
  readonly limitUsd: number
  readonly spentUsd: number
  readonly remainingUsd: number
  /** Add spend. Called by the gateway after each call. */
  record(costUsd: number): void
}

/** Which ceiling was hit. */
export type BudgetScope = 'call' | 'budget'

/** Typed refusal raised when a call (or its named budget) would exceed its ceiling. */
export class BudgetExceededError extends AgentsKitError {
  readonly scope: BudgetScope
  /** Budget name when `scope === 'budget'`. */
  readonly budget: string | undefined
  readonly limitUsd: number
  /** Cost (call scope) or accumulated spend (budget scope) that hit the ceiling. */
  readonly costUsd: number

  constructor(options: { scope: BudgetScope; budget?: string; limitUsd: number; costUsd: number }) {
    const what = options.scope === 'call' ? 'per-call cap' : `budget "${options.budget}"`
    super({
      code: 'AK_BUDGET_EXCEEDED',
      message: `Cost ceiling exceeded for ${what}: $${options.costUsd.toFixed(6)} vs limit $${options.limitUsd.toFixed(6)}`,
      hint: 'Raise the limit, shrink the request (maxTokens / history), or use a cheaper model.',
    })
    this.name = 'BudgetExceededError'
    this.scope = options.scope
    this.budget = options.budget
    this.limitUsd = options.limitUsd
    this.costUsd = options.costUsd
  }
}

/** Create a named USD budget. Share one instance per client/tenant. */
export function createCostBudget(name: string, limitUsd: number): CostBudget {
  if (!Number.isFinite(limitUsd) || limitUsd < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `Budget "${name}" needs a finite, non-negative limitUsd`,
    })
  }
  let spent = 0
  return {
    name,
    limitUsd,
    get spentUsd() { return spent },
    get remainingUsd() { return Math.max(0, limitUsd - spent) },
    record(costUsd) { if (Number.isFinite(costUsd) && costUsd > 0) spent += costUsd },
  }
}

/** Usage reported for one call. */
export interface GatewayUsage extends TokenUsage {
  provider: GatewayProvider
  model: string
  /** Estimated cost in USD; undefined when no `pricing` was configured. */
  costUsd?: number
}

/** Configuration for {@link createModelGateway}. Switching provider is a config change. */
export interface ModelGatewayConfig {
  provider: GatewayProvider
  model: string
  /** Optional for `cliproxyapi`. */
  apiKey?: string
  /** Override the endpoint. For `cliproxyapi` defaults to `http://localhost:8317`. */
  baseUrl?: string
  /** USD per 1M tokens. Required when `maxCostUsd` or `budget` is set. */
  pricing?: GatewayPricing
  /** Per-call ceiling in USD. */
  maxCostUsd?: number
  /** Named budget(s) charged by every call; a spent budget refuses further calls. */
  budget?: CostBudget | CostBudget[]
  /** Output token ceiling used for the pre-flight worst-case estimate. */
  maxTokens?: number
  /** Fires with the final usage of each call (also emitted as a `usage` chunk). */
  onUsage?: (usage: GatewayUsage) => void
  fetch?: typeof globalThis.fetch
  retry?: RetryOptions
}

function buildBase(config: ModelGatewayConfig): AdapterFactory {
  const { provider, model, apiKey, baseUrl, retry } = config
  const fetch = config.fetch
  if (provider === 'anthropic') {
    return anthropic({ apiKey: apiKey ?? '', model, baseUrl, maxTokens: config.maxTokens, retry, fetch })
  }
  if (provider === 'openai') {
    return openai({ apiKey: apiKey ?? '', model, baseUrl, retry, fetch, includeUsage: true })
  }
  if (provider === 'openrouter') {
    return openai({ apiKey: apiKey ?? '', model, baseUrl: baseUrl ?? 'https://openrouter.ai/api/v1', retry, fetch, includeUsage: true })
  }
  return openaiCompatible({ apiKey, model, baseUrl: baseUrl ?? 'http://localhost:8317', retry, fetch, includeUsage: true })
}

const costOf = (usage: TokenUsage, pricing: GatewayPricing): number =>
  (usage.promptTokens * pricing.input + usage.completionTokens * pricing.output) / 1_000_000

/** chars/4 heuristic, as in core's approximateCounter. */
const estimateInputTokens = (request: AdapterRequest): number =>
  request.messages.reduce((n, m) => n + Math.ceil((m.content?.length ?? 0) / 4) + 2, 0)

/**
 * One adapter for OpenRouter, Anthropic, OpenAI and CLIProxyAPI. Every call
 * reports tokens + estimated USD cost (a `usage` chunk with `metadata.costUsd`
 * and `onUsage`) and is refused with {@link BudgetExceededError} when it would
 * breach `maxCostUsd` or a named budget. The error is thrown from `stream()`.
 */
export function createModelGateway(config: ModelGatewayConfig): AdapterFactory {
  const budgets = [config.budget ?? []].flat()
  const { pricing, maxCostUsd } = config
  if ((maxCostUsd !== undefined || budgets.length > 0) && !pricing) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createModelGateway: maxCostUsd / budget require `pricing` to estimate cost',
      hint: 'Pass pricing: { input, output } in USD per 1M tokens (e.g. getModel(...)?.cost from @agentskit/adapters/catalog).',
    })
  }
  const base = buildBase(config)

  return {
    capabilities: base.capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      const inner = base.createSource(request)
      return {
        abort: () => inner.abort(),
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          for (const b of budgets) {
            if (b.spentUsd >= b.limitUsd) {
              throw new BudgetExceededError({ scope: 'budget', budget: b.name, limitUsd: b.limitUsd, costUsd: b.spentUsd })
            }
          }
          const outputCap = request.context?.maxTokens ?? config.maxTokens
          if (pricing && outputCap !== undefined) {
            const worst = costOf(
              { promptTokens: estimateInputTokens(request), completionTokens: outputCap, totalTokens: 0 },
              pricing,
            )
            if (maxCostUsd !== undefined && worst > maxCostUsd) {
              throw new BudgetExceededError({ scope: 'call', limitUsd: maxCostUsd, costUsd: worst })
            }
            for (const b of budgets) {
              if (b.spentUsd + worst > b.limitUsd) {
                throw new BudgetExceededError({ scope: 'budget', budget: b.name, limitUsd: b.limitUsd, costUsd: b.spentUsd + worst })
              }
            }
          }

          // Usage chunks are cumulative per field (Anthropic splits input/output
          // across events), so keep the max seen and emit one total at the end.
          let promptTokens = 0
          let completionTokens = 0
          let sawUsage = false
          let finished = false
          const finish = (): StreamChunk | undefined => {
            if (finished || !sawUsage) return undefined
            finished = true
            const usage: GatewayUsage = {
              promptTokens, completionTokens, totalTokens: promptTokens + completionTokens,
              provider: config.provider, model: config.model,
            }
            if (pricing) usage.costUsd = costOf(usage, pricing)
            for (const b of budgets) b.record(usage.costUsd ?? 0)
            config.onUsage?.(usage)
            return { type: 'usage', usage, metadata: { provider: usage.provider, model: usage.model, costUsd: usage.costUsd } }
          }
          const enforce = (chunk: StreamChunk | undefined): void => {
            const costUsd = chunk?.metadata?.costUsd
            if (maxCostUsd !== undefined && typeof costUsd === 'number' && costUsd > maxCostUsd) {
              throw new BudgetExceededError({ scope: 'call', limitUsd: maxCostUsd, costUsd })
            }
            for (const b of budgets) {
              if (b.spentUsd > b.limitUsd) {
                throw new BudgetExceededError({ scope: 'budget', budget: b.name, limitUsd: b.limitUsd, costUsd: b.spentUsd })
              }
            }
          }

          for await (const chunk of inner.stream()) {
            if (chunk.type === 'usage' && chunk.usage) {
              sawUsage = true
              promptTokens = Math.max(promptTokens, chunk.usage.promptTokens)
              completionTokens = Math.max(completionTokens, chunk.usage.completionTokens)
              continue
            }
            if (chunk.type === 'done' || chunk.type === 'error') {
              const usageChunk = finish()
              if (usageChunk) { yield usageChunk; enforce(usageChunk) }
            }
            yield chunk
          }
          const usageChunk = finish()
          if (usageChunk) { yield usageChunk; enforce(usageChunk) }
        },
      }
    },
  }
}
