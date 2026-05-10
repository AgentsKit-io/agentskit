import type { RouterCandidate } from './router'

/**
 * Carbon-aware routing data. Estimated grid CO2 intensity (gCO2eq per
 * 1k tokens) per provider+region. Numbers are best-effort approximations
 * derived from public grid-mix data and provider PUE disclosures — they
 * are good enough to differentiate "very dirty" from "very clean" but
 * are not audited.
 *
 * Sources:
 *   - Electricity Maps (electricitymaps.com) for grid carbon intensity.
 *   - Provider PUE / efficiency reports (Anthropic, Google, AWS).
 *   - LLMCarbon (Faiz et al., 2024) for tok→J coefficients.
 *
 * Pull-requests welcome to refine. The table is community-updateable
 * and ships at compile time; a runtime table can be passed via
 * `applyCarbonTable(candidates, customTable)`.
 *
 * Closes part of issue #209.
 */

export type ProviderRegionKey = `${string}:${string}`

export type CarbonTable = Record<ProviderRegionKey, number>

/**
 * Default carbon table. Keys are `provider:region`; values are
 * estimated gCO2eq per 1k tokens of typical mixed input/output. Lower
 * is greener.
 */
export const DEFAULT_CARBON_TABLE: CarbonTable = {
  // Anthropic — primarily AWS us-east-* / eu-west-* via Bedrock-style fronts.
  'anthropic:us-east-1': 0.42,
  'anthropic:us-west-2': 0.18,
  'anthropic:eu-central-1': 0.32,
  'anthropic:eu-west-1': 0.27,

  // OpenAI — Azure East US / West Europe / Sweden Central.
  'openai:eastus': 0.40,
  'openai:westus3': 0.19,
  'openai:swedencentral': 0.04,
  'openai:westeurope': 0.28,

  // Google (Vertex / Gemini) — typically reports lowest PUE.
  'google:us-central1': 0.34,
  'google:us-west1': 0.16,
  'google:europe-west1': 0.21,
  'google:europe-north1': 0.05,

  // AWS Bedrock direct.
  'aws:us-east-1': 0.42,
  'aws:us-west-2': 0.18,
  'aws:eu-west-1': 0.27,

  // Local / on-device — only the device's grid matters.
  'ollama:local': 0.30,
  'webllm:browser': 0.30,
  'lmstudio:local': 0.30,

  // Self-hosted / community.
  'groq:us-east-1': 0.40,
  'fireworks:us-west-2': 0.18,
  'together:us-east-1': 0.42,
  'cerebras:us-west-2': 0.18,
}

export interface ApplyCarbonOptions {
  /** Override the default table. */
  table?: CarbonTable
  /**
   * How to derive the lookup key for a candidate. Defaults to
   * `${provider}:${region}` where `provider` is the candidate id
   * before the first `-` and `region` is `candidate.region`.
   */
  keyFor?: (candidate: RouterCandidate) => ProviderRegionKey | undefined
  /** Fallback gCO2eq per 1k tokens when no table entry is found. */
  fallback?: number
}

function defaultKey(candidate: RouterCandidate): ProviderRegionKey | undefined {
  if (!candidate.region) return undefined
  const provider = candidate.id.split(/[-:]/)[0]
  return `${provider}:${candidate.region}` as ProviderRegionKey
}

/**
 * Decorate a list of router candidates with `gCO2PerKtok` from a
 * carbon table. Returns a new list — does not mutate the input.
 *
 * ```ts
 * const candidates = applyCarbonTable([
 *   { id: 'openai-eu',   adapter: openai({...}), region: 'swedencentral', cost: 0.6 },
 *   { id: 'anthropic-us', adapter: anthropic({...}), region: 'us-east-1',   cost: 0.5 },
 * ])
 *
 * const router = createRouter({ candidates, policy: 'green-cost' })
 * ```
 */
export function applyCarbonTable(
  candidates: RouterCandidate[],
  options: ApplyCarbonOptions = {},
): RouterCandidate[] {
  const table = options.table ?? DEFAULT_CARBON_TABLE
  const keyFor = options.keyFor ?? defaultKey
  return candidates.map(c => {
    if (c.gCO2PerKtok != null) return c
    const key = keyFor(c)
    const value = key ? table[key] : undefined
    return { ...c, gCO2PerKtok: value ?? options.fallback }
  })
}

/**
 * Estimated CO2 emitted by a single completion (grams). Multiply
 * `gCO2PerKtok` by `tokens / 1000`. Provided as a convenience for
 * dashboards / chargeback reports — runtimes typically derive this
 * from token usage events.
 */
export function estimateCO2Grams(gCO2PerKtok: number | undefined, tokens: number): number {
  if (gCO2PerKtok == null) return 0
  return (tokens / 1000) * gCO2PerKtok
}
