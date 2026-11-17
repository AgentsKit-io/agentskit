import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, StreamChunk, StreamSource, TokenUsage } from '@agentskit/core'
import { getCachedCost } from '../catalog/pricing'
import { GatewayCapError } from './errors'

export { GatewayCapError, GatewayErrorCodes } from './errors'

/** USD per one million tokens. */
export interface GatewayPricing {
  input: number
  output: number
}

/** Tokens and estimated USD cost of one call. */
export interface GatewayCallUsage {
  usage: TokenUsage
  costUsd: number
}

/** Named budget with a USD cap, shared by every gateway that references it. */
export interface GatewayBudget {
  name: string
  limitUsd: number
  /** Spend so far; mutated as calls complete. */
  spentUsd: number
}

/** Options for `createGateway`. */
export interface GatewayOptions {
  adapter: AdapterFactory
  /** Catalog provider id (e.g. `openai`); used with `model` to look up pricing. */
  provider?: string
  model?: string
  /** Explicit pricing; wins over the catalog. */
  pricing?: GatewayPricing
  /** Refuse a call whose estimated cost exceeds this (USD). */
  perCallCapUsd?: number
  budget?: GatewayBudget
  /** Fires once per call with its tokens and cost. */
  onCall?: (call: GatewayCallUsage) => void
}

/** Create a named budget. */
export function createBudget(name: string, limitUsd: number): GatewayBudget {
  return { name, limitUsd, spentUsd: 0 }
}

/** Estimated USD cost of the given usage at the given per-million pricing. */
export function estimateCostUsd(usage: TokenUsage, pricing: GatewayPricing): number {
  return (usage.promptTokens * pricing.input + usage.completionTokens * pricing.output) / 1_000_000
}

function resolvePricing(options: GatewayOptions): GatewayPricing | undefined {
  if (options.pricing) return options.pricing
  if (!options.provider || !options.model) return undefined
  const cost = getCachedCost(options.provider, options.model)
  if (cost?.input == null || cost.output == null) return undefined
  return { input: cost.input, output: cost.output }
}

function mergeUsage(prev: TokenUsage | undefined, next: TokenUsage): TokenUsage {
  const promptTokens = Math.max(prev?.promptTokens ?? 0, next.promptTokens)
  const completionTokens = Math.max(prev?.completionTokens ?? 0, next.completionTokens)
  return { promptTokens, completionTokens, totalTokens: Math.max(next.totalTokens, promptTokens + completionTokens) }
}

/**
 * Wrap an adapter so each call reports tokens and estimated USD cost (on the
 * `usage` chunk metadata: `costUsd`) and is refused with a `GatewayCapError`
 * when over the per-call cap or the named budget.
 */
export function createGateway(options: GatewayOptions): AdapterFactory {
  const pricing = resolvePricing(options)
  if (!pricing) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createGateway: no pricing found for the model.',
      hint: 'Pass `pricing` ({ input, output } in USD per 1M tokens) or a provider/model present in the catalog.',
    })
  }
  const { adapter, perCallCapUsd, budget } = options
  return {
    capabilities: { ...adapter.capabilities, usage: true },
    createSource: (request): StreamSource => {
      const inner = adapter.createSource(request)
      return {
        abort: () => inner.abort(),
        stream: async function* () {
          if (budget && budget.spentUsd >= budget.limitUsd) {
            inner.abort()
            throw new GatewayCapError({
              kind: 'budget',
              limitUsd: budget.limitUsd,
              actualUsd: budget.spentUsd,
              budget: budget.name,
            })
          }
          let usage: TokenUsage | undefined
          let charged = 0
          const settle = (): number => {
            const cost = usage ? estimateCostUsd(usage, pricing) : 0
            if (budget) budget.spentUsd += cost - charged
            charged = cost
            return cost
          }
          const check = (cost: number): void => {
            if (perCallCapUsd !== undefined && cost > perCallCapUsd) {
              inner.abort()
              throw new GatewayCapError({ kind: 'per-call', limitUsd: perCallCapUsd, actualUsd: cost })
            }
            if (budget && budget.spentUsd > budget.limitUsd) {
              inner.abort()
              throw new GatewayCapError({
                kind: 'budget',
                limitUsd: budget.limitUsd,
                actualUsd: budget.spentUsd,
                budget: budget.name,
              })
            }
          }
          for await (const chunk of inner.stream()) {
            if (chunk.type === 'usage' && chunk.usage) {
              usage = mergeUsage(usage, chunk.usage)
              const cost = settle()
              check(cost)
              yield { ...chunk, usage, metadata: { ...chunk.metadata, costUsd: cost } } as StreamChunk
              continue
            }
            if (chunk.type === 'done') {
              if (usage) options.onCall?.({ usage, costUsd: charged })
              yield usage
                ? ({ ...chunk, metadata: { ...chunk.metadata, usage, costUsd: charged } } as StreamChunk)
                : chunk
              continue
            }
            yield chunk
          }
        },
      }
    },
  }
}
