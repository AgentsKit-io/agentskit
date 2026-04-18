/**
 * Per-million-token prices in USD. Keeps only a few canonical models —
 * hosts can override at runtime via `registerPricing`. Values are
 * publicly listed prices as of 2026-Q1 and may drift; authoritative
 * cost tracking should come from the provider's invoice.
 */
export interface ModelPricing {
  inputPerM: number
  outputPerM: number
}

const builtinPricing: Record<string, ModelPricing> = {
  'gpt-4o': { inputPerM: 2.5, outputPerM: 10 },
  'gpt-4o-mini': { inputPerM: 0.15, outputPerM: 0.6 },
  'gpt-4.1': { inputPerM: 2, outputPerM: 8 },
  'gpt-4.1-mini': { inputPerM: 0.4, outputPerM: 1.6 },
  'claude-opus-4': { inputPerM: 15, outputPerM: 75 },
  'claude-sonnet-4': { inputPerM: 3, outputPerM: 15 },
  'claude-haiku-4': { inputPerM: 0.8, outputPerM: 4 },
  'gemini-2.5-pro': { inputPerM: 1.25, outputPerM: 10 },
  'gemini-2.5-flash': { inputPerM: 0.3, outputPerM: 2.5 },
}

const customPricing: Record<string, ModelPricing> = {}

export function registerPricing(model: string, pricing: ModelPricing): void {
  customPricing[model] = pricing
}

export function getPricing(model: string | undefined): ModelPricing | undefined {
  if (!model) return undefined
  if (customPricing[model]) return customPricing[model]
  if (builtinPricing[model]) return builtinPricing[model]
  // Prefix match: `openai/gpt-4o` → `gpt-4o`.
  const short = model.includes('/') ? model.split('/').pop()! : model
  return customPricing[short] ?? builtinPricing[short]
}

export interface TokenUsageLike {
  promptTokens: number
  completionTokens: number
}

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
  const pricing = getPricing(model)
  if (!pricing) return undefined
  const inputUsd = (usage.promptTokens / 1_000_000) * pricing.inputPerM
  const outputUsd = (usage.completionTokens / 1_000_000) * pricing.outputPerM
  return {
    model,
    inputUsd,
    outputUsd,
    totalUsd: inputUsd + outputUsd,
  }
}
