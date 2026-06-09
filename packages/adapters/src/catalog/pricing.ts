import { catalog, getModel } from './loader'
import type { CatalogModelCost } from './types'

/**
 * Live pricing source. `models.dev` is the same data the snapshot is generated
 * from — most providers don't expose a pricing API, so this is the realistic
 * live source. Used ONLY when the caller opts in.
 */
const LIVE_URL = 'https://models.dev/api.json'

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

export interface ResolvedCost {
  cost?: CatalogModelCost
  /** Where the returned cost came from. */
  source: 'live' | 'cache'
  /** True when served from cache and the snapshot is older than 30 days. */
  stale: boolean
}

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000

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
    const cost = liveCostFrom(await res.json(), providerId, modelId)
    if (!cost) return cachedCost(providerId, modelId, now)
    return { cost, source: 'live', stale: false }
  } catch {
    return cachedCost(providerId, modelId, now)
  } finally {
    clearTimeout(timer)
  }
}
