import { AdapterError, ConfigError, ErrorCodes } from '@agentskit/core'
import type {
  AdapterCapabilities,
  AdapterFactory,
  AdapterRequest,
  DataRegion,
  StreamChunk,
  StreamSource,
} from '@agentskit/core'
import { isAbortError } from './stream-errors'

export interface RouterCandidate {
  id: string
  adapter: AdapterFactory
  /** Data residency region for this adapter endpoint. */
  region?: DataRegion
  /**
   * Relative cost hint (lower wins for policy='cheapest'). Only
   * relative values matter — use $/1M tokens or any consistent unit.
   */
  cost?: number
  /** Typical latency in ms. Lower wins for policy='fastest'. */
  latencyMs?: number
  /**
   * Capability override. Defaults to `adapter.capabilities`.
   * Used to reject candidates missing required features
   * (e.g. tools, multiModal).
   */
  capabilities?: AdapterCapabilities
  /** Free-form tags used by classifier routing (e.g. 'fast', 'coding'). */
  tags?: string[]
  /**
   * Estimated grid CO2 intensity (gCO2eq per 1k tokens) for this
   * adapter+region. Lower wins for `policy='greenest'`. Use
   * `applyCarbonTable()` to populate from `DEFAULT_CARBON_TABLE` or
   * a custom table.
   */
  gCO2PerKtok?: number
}

export type RouterPolicy =
  | 'cheapest'
  | 'fastest'
  | 'greenest'
  | 'green-cost'
  | 'capability-match'
  | ((input: { request: AdapterRequest; candidates: RouterCandidate[] }) => string | Promise<string>)

export interface RouterOptions {
  candidates: RouterCandidate[]
  /** Require all selected adapters to match this data-residency region. */
  region?: DataRegion
  /** Dynamic region selector. Takes precedence over `region`. */
  regionOf?: (request: AdapterRequest) => DataRegion | undefined
  /** Policy when `classify` doesn't pick a candidate. Default 'cheapest'. */
  policy?: RouterPolicy
  /**
   * Fast path: inspect the request, return a candidate id or tag(s).
   * Return `undefined` to fall back to `policy`.
   */
  classify?: (request: AdapterRequest) => string | string[] | undefined
  /** Observability hook — fires once per decision. */
  onRoute?: (decision: { id: string; reason: string; request: AdapterRequest }) => void
}

function requireCapabilities(request: AdapterRequest): AdapterCapabilities {
  const needs: AdapterCapabilities = {}
  if (request.context?.tools && request.context.tools.length > 0) needs.tools = true
  return needs
}

function matchesCapabilities(need: AdapterCapabilities, have: AdapterCapabilities | undefined): boolean {
  if (!have) return true
  for (const key of Object.keys(need) as Array<keyof AdapterCapabilities>) {
    if (key === 'extensions') continue
    if (need[key] && have[key] === false) return false
  }
  return true
}

function pickSyncPolicy(
  pool: RouterCandidate[],
  policy: Exclude<RouterPolicy, (...a: never[]) => unknown>,
): { c: RouterCandidate; reason: string } {
  if (policy === 'cheapest') {
    const c = pool.reduce((best, x) => ((x.cost ?? Infinity) < (best.cost ?? Infinity) ? x : best), pool[0]!)
    return { c, reason: 'cheapest' }
  }
  if (policy === 'fastest') {
    const c = pool.reduce((best, x) => ((x.latencyMs ?? Infinity) < (best.latencyMs ?? Infinity) ? x : best), pool[0]!)
    return { c, reason: 'fastest' }
  }
  if (policy === 'greenest') {
    const c = pool.reduce((best, x) => ((x.gCO2PerKtok ?? Infinity) < (best.gCO2PerKtok ?? Infinity) ? x : best), pool[0]!)
    return { c, reason: 'greenest' }
  }
  if (policy === 'green-cost') {
    // Composite score: normalised carbon × normalised cost. Lower wins.
    // A candidate missing either signal is treated as median (neutral).
    const carbonValues = pool.map(p => p.gCO2PerKtok).filter((v): v is number => v != null)
    const costValues = pool.map(p => p.cost).filter((v): v is number => v != null)
    const maxC = Math.max(1, ...carbonValues)
    const maxCost = Math.max(1, ...costValues)
    const score = (x: RouterCandidate): number => {
      const carbon = (x.gCO2PerKtok ?? maxC / 2) / maxC
      const cost = (x.cost ?? maxCost / 2) / maxCost
      return carbon + cost
    }
    const c = pool.reduce((best, x) => (score(x) < score(best) ? x : best), pool[0]!)
    return { c, reason: 'green-cost' }
  }
  return { c: pool[0]!, reason: 'capability-match' }
}

function matchesRegion(candidate: RouterCandidate, region: DataRegion | undefined): boolean {
  return region === undefined || candidate.region === region
}

/**
 * Build an AdapterFactory that picks one of N candidates per request.
 *
 * Resolution order:
 *  1. `classify(request)` returns a candidate id → use it
 *  2. `classify(request)` returns tag(s) → filter by tags, then `policy`
 *  3. Fall back to `policy` over all capability-matched candidates
 */
export function createRouter(options: RouterOptions): AdapterFactory {
  const { candidates } = options
  if (candidates.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createRouter requires at least one candidate',
      hint: 'Pass at least one candidate, e.g. createRouter({ candidates: [{ id, adapter, capabilities }] }).',
    })
  }
  const policy = options.policy ?? 'cheapest'

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const need = requireCapabilities(request)
      const region = options.regionOf?.(request) ?? options.region
      const capable = candidates.filter(c => matchesCapabilities(need, c.capabilities ?? c.adapter.capabilities))
      const eligible = capable.filter(c => matchesRegion(c, region))

      if (capable.length > 0 && eligible.length === 0 && region !== undefined) {
        // Programmer configuration at createSource time — ADR allows throw.
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `no candidate satisfies required region: ${region}`,
          hint: 'Set candidate.region to the requested data-residency region, or remove the router region requirement.',
        })
      }

      const classified = options.classify?.(request)
      if (typeof classified === 'string') {
        const c = eligible.find(x => x.id === classified)
        if (c) {
          options.onRoute?.({ id: c.id, reason: region ? `classify:id:${region}` : 'classify:id', request })
          return c.adapter.createSource(request)
        }
      }

      let pool = eligible
      let pickedBy: string | undefined
      if (Array.isArray(classified) && classified.length > 0) {
        const filtered = eligible.filter(c => c.tags && classified.every(t => c.tags!.includes(t)))
        if (filtered.length > 0) {
          pool = filtered
          pickedBy = region ? `classify:tags:${region}` : 'classify:tags'
        }
      }

      if (pool.length === 0) {
        // No eligible candidate for this request — config/setup failure at createSource.
        throw new AdapterError({
          code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
          message: 'no candidate satisfies the request',
          hint: 'Ensure at least one candidate declares the required capabilities (tools, json, etc.).',
        })
      }

      if (typeof policy === 'function') {
        const maybe = policy({ request, candidates: pool })
        if (typeof maybe !== 'string') {
          // Defer resolution into the streamed source.
          let aborted = false
          let child: StreamSource | undefined
          return {
            abort: () => {
              aborted = true
              child?.abort()
            },
            stream: async function* () {
              if (aborted) return
              let id: string
              try {
                id = await maybe
              } catch (err) {
                if (aborted || isAbortError(err)) return
                const error = err instanceof Error ? err : new Error(String(err))
                yield {
                  type: 'error',
                  content: error.message,
                  metadata: { error },
                } as StreamChunk
                return
              }
              if (aborted) return
              const c = pool.find(x => x.id === id)
              if (!c) {
                const error = new ConfigError({
                  code: ErrorCodes.AK_CONFIG_INVALID,
                  message: `policy returned unknown id: ${id}`,
                  hint: 'Custom policy functions must return one of the candidate ids.',
                })
                yield {
                  type: 'error',
                  content: error.message,
                  metadata: { error },
                } as StreamChunk
                return
              }
              if (aborted) return
              try {
                options.onRoute?.({ id: c.id, reason: pickedBy ?? 'custom policy', request })
                child = c.adapter.createSource(request)
                if (aborted) {
                  child.abort()
                  return
                }
                for await (const chunk of child.stream()) {
                  if (aborted) {
                    child.abort()
                    return
                  }
                  yield chunk
                }
              } catch (err) {
                if (aborted || isAbortError(err)) return
                const error = err instanceof Error ? err : new Error(String(err))
                yield {
                  type: 'error',
                  content: error.message,
                  metadata: { error },
                } as StreamChunk
              }
            },
          }
        }
        const c = pool.find(x => x.id === maybe)
        if (!c) {
          // Sync policy at createSource — programmer error may throw.
          throw new ConfigError({
            code: ErrorCodes.AK_CONFIG_INVALID,
            message: `policy returned unknown id: ${maybe}`,
            hint: 'Custom policy functions must return one of the candidate ids.',
          })
        }
        options.onRoute?.({ id: c.id, reason: pickedBy ?? 'custom policy', request })
        return c.adapter.createSource(request)
      }

      const { c, reason } = pickSyncPolicy(pool, policy)
      options.onRoute?.({ id: c.id, reason: pickedBy ?? reason, request })
      return c.adapter.createSource(request)
    },
  }
}
