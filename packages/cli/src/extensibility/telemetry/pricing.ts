import { computeCallCost, getCachedCost } from '@agentskit/adapters/catalog'

/**
 * Per-million-token prices in USD. The price table is the models.dev catalog
 * shipped in `@agentskit/adapters/catalog`; hosts can override a model at
 * runtime via `registerPricing`. Authoritative cost tracking should still come
 * from the provider's invoice.
 */
export interface ModelPricing {
  inputPerM: number
  outputPerM: number
}

/** Providers searched, in order, when a bare model id (no `provider/` prefix) is given. */
const BARE_MODEL_PROVIDERS = ['openai', 'anthropic', 'google']

const customPricing: Record<string, ModelPricing> = {}

/**
 * Registers or replaces per-million-token prices for a model in this process.
 * @param model Model identifier to register.
 * @param pricing Input and output prices in USD per million tokens.
 * @returns Nothing.
 */
export function registerPricing(model: string, pricing: ModelPricing): void {
  customPricing[model] = pricing
}

function resolveCatalogKey(model: string): { providerId: string; modelId: string } | undefined {
  if (model.includes('/')) {
    const idx = model.indexOf('/')
    const providerId = model.slice(0, idx)
    const modelId = model.slice(idx + 1)
    if (getCachedCost(providerId, modelId)) return { providerId, modelId }
  }
  const short = model.includes('/') ? model.split('/').pop()! : model
  for (const providerId of BARE_MODEL_PROVIDERS) {
    if (getCachedCost(providerId, short)) return { providerId, modelId: short }
  }
  return undefined
}

function customFor(model: string): ModelPricing | undefined {
  return customPricing[model] ?? customPricing[model.split('/').pop()!]
}

/**
 * Looks up model pricing: runtime override first, then the models.dev catalog.
 * @param model Model identifier (bare or `provider/model`).
 * @returns Pricing for the model, or `undefined` when it is unknown.
 */
export function getPricing(model: string | undefined): ModelPricing | undefined {
  if (!model) return undefined
  const custom = customFor(model)
  if (custom) return custom
  const key = resolveCatalogKey(model)
  const cost = key && getCachedCost(key.providerId, key.modelId)
  if (!cost || cost.input == null || cost.output == null) return undefined
  return { inputPerM: cost.input, outputPerM: cost.output }
}

/**
 * Prompt and completion token counts used for cost calculation.

 */
export interface TokenUsageLike {
  promptTokens: number
  completionTokens: number
}

/**
 * Estimated input, output, and total cost for one model response.

 */
export interface ComputedCost {
  model: string
  inputUsd: number
  outputUsd: number
  totalUsd: number
}

/** Returns computed cost, or `undefined` if no pricing is registered for the model. */
export function computeCost(
  model: string | undefined,
  usage: TokenUsageLike,
): ComputedCost | undefined {
  if (!model) return undefined
  const custom = customFor(model)
  const key = custom ? { providerId: 'custom', modelId: model } : resolveCatalogKey(model)
  if (!key) return undefined
  const priceOverrides = custom
    ? { [`custom/${model}`]: { input: custom.inputPerM, output: custom.outputPerM } }
    : undefined
  const input = computeCallCost(key.providerId, key.modelId, { ...usage, completionTokens: 0 }, { priceOverrides })
  const output = computeCallCost(key.providerId, key.modelId, { promptTokens: 0, completionTokens: usage.completionTokens }, { priceOverrides })
  if (input.costUsd === undefined || output.costUsd === undefined) return undefined
  return {
    model,
    inputUsd: input.costUsd,
    outputUsd: output.costUsd,
    totalUsd: input.costUsd + output.costUsd,
  }
}
