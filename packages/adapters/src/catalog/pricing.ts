import { readJson } from '@agentskit/net'
import { catalog, getModel } from './loader'
import type { CatalogModelCost } from './types'

/**
 * Live pricing source. `models.dev` is the same data the snapshot is generated
 * from — most providers don't expose a pricing API, so this is the realistic
 * live source. Used ONLY when the caller opts in.
 */
const LIVE_URL = 'https://models.dev/api.json'

/**
 * Options for resolving model pricing from the local catalog or live source.
 */
export interface ResolveCostOptions {
  /**
   * Opt in to a live fetch. Default `false` keeps the runtime offline and
   * deterministic (the issue's "no runtime fetch" default). When `true`, a live
   * lookup is attempted and the cached snapshot is the guaranteed fallback.
   */
  live?: boolean
  /** Abort the live fetch after this many ms (default 3000). */
  timeoutMs?: number
  /** Injectable fetch for testing. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch
}

/**
 * Model pricing together with its source and cache freshness.
 */
export interface ResolvedCost {
  cost?: CatalogModelCost
  /** Where the returned cost came from. */
  source: 'live' | 'cache'
  /** True when served from cache and the snapshot is older than 30 days. */
  stale: boolean
}

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000
const MAX_PRICING_RESPONSE_BYTES = 16 * 1024 * 1024

function cachedCost(providerId: string, modelId: string, now: number): ResolvedCost {
  const cost = getModel(providerId, modelId)?.cost
  const age = now - new Date(catalog.generatedAt).getTime()
  return { cost, source: 'cache', stale: Number.isFinite(age) && age > STALE_AFTER_MS }
}

function liveCostFrom(data: unknown, providerId: string, modelId: string): CatalogModelCost | undefined {
  const provider = (data as Record<string, { models?: Record<string, { cost?: Record<string, number> }> }>)[
    providerId
  ]
  const raw = provider?.models?.[modelId]?.cost
  if (!raw || typeof raw !== 'object') return undefined
  const cost: CatalogModelCost = {}
  if (raw.input != null) cost.input = raw.input
  if (raw.output != null) cost.output = raw.output
  if (raw.cache_read != null) cost.cacheRead = raw.cache_read
  if (raw.cache_write != null) cost.cacheWrite = raw.cache_write
  return Object.keys(cost).length > 0 ? cost : undefined
}

/** Cached cost only — synchronous, never touches the network. */
export function getCachedCost(providerId: string, modelId: string): CatalogModelCost | undefined {
  return getModel(providerId, modelId)?.cost
}

/**
 * Resolve a model's cost. Cache-only by default; with `{ live: true }` it tries
 * the live source first and falls back to the cached snapshot on any failure
 * (timeout, network, missing entry). Never throws on a network problem.
 */
export async function resolveCost(
  providerId: string,
  modelId: string,
  options: ResolveCostOptions = {},
): Promise<ResolvedCost> {
  const now = Date.now()
  if (!options.live) return cachedCost(providerId, modelId, now)

  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 3000)
  try {
    const res = await fetchImpl(LIVE_URL, { signal: controller.signal })
    if (!res.ok) return cachedCost(providerId, modelId, now)
    const cost = liveCostFrom(
      await readJson<unknown>(res, { maxBytes: MAX_PRICING_RESPONSE_BYTES }),
      providerId,
      modelId,
    )
    if (!cost) return cachedCost(providerId, modelId, now)
    return { cost, source: 'live', stale: false }
  } catch {
    return cachedCost(providerId, modelId, now)
  } finally {
    clearTimeout(timer)
  }
}

export interface CallUsage {
  promptTokens: number
  completionTokens: number
}

export interface ComputeCallCostOptions {
  /** Price overrides keyed by `providerId/modelId`, USD per 1M tokens. Wins over the catalog. */
  priceOverrides?: Record<string, CatalogModelCost>
}

/** Tokens and USD cost of one model call. */
export interface CallCost {
  inputTokens: number
  outputTokens: number
  /** USD; undefined when usage was not reported or no price is known. */
  costUsd: number | undefined
  /** False when the response carried no usage — tokens/cost are then not real zeros. */
  usageReported: boolean
  priceSource: 'override' | 'catalog' | 'none'
}

/** Price one call from its usage using the models.dev catalog, with config overrides. */
export function computeCallCost(
  providerId: string,
  modelId: string,
  usage: CallUsage | undefined,
  options: ComputeCallCostOptions = {},
): CallCost {
  const override = options.priceOverrides?.[`${providerId}/${modelId}`]
  const price = override ?? getCachedCost(providerId, modelId)
  const priceSource = override ? 'override' : price ? 'catalog' : 'none'
  if (!usage) {
    return { inputTokens: 0, outputTokens: 0, costUsd: undefined, usageReported: false, priceSource }
  }
  const inputTokens = usage.promptTokens
  const outputTokens = usage.completionTokens
  const costUsd =
    price && (price.input != null || price.output != null)
      ? (inputTokens * (price.input ?? 0) + outputTokens * (price.output ?? 0)) / 1_000_000
      : undefined
  return { inputTokens, outputTokens, costUsd, usageReported: true, priceSource }
}
