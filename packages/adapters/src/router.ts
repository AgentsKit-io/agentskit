import { AdapterError, ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterCapabilities, AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'

export interface RouterCandidate {
  id: string
  adapter: AdapterFactory
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
}

export type RouterPolicy =
  | 'cheapest'
  | 'fastest'
  | 'capability-match'
  | ((input: { request: AdapterRequest; candidates: RouterCandidate[] }) => string | Promise<string>)

export interface RouterOptions {
  candidates: RouterCandidate[]
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
  return { c: pool[0]!, reason: 'capability-match' }
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
      const capable = candidates.filter(c => matchesCapabilities(need, c.capabilities ?? c.adapter.capabilities))

      const classified = options.classify?.(request)
      if (typeof classified === 'string') {
        const c = capable.find(x => x.id === classified)
        if (c) {
          options.onRoute?.({ id: c.id, reason: 'classify:id', request })
          return c.adapter.createSource(request)
        }
      }

      let pool = capable
      let pickedBy: string | undefined
      if (Array.isArray(classified) && classified.length > 0) {
        const filtered = capable.filter(c => c.tags && classified.every(t => c.tags!.includes(t)))
        if (filtered.length > 0) {
          pool = filtered
          pickedBy = 'classify:tags'
        }
      }

      if (pool.length === 0) {
        throw new AdapterError({
          code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
          message: 'no candidate satisfies the request',
          hint: 'Ensure at least one candidate declares the required capabilities (tools, json, etc.).',
        })
      }

      if (typeof policy === 'function') {
        const maybe = policy({ request, candidates: pool })
        if (maybe instanceof Promise) {
          // Defer resolution into the streamed source.
          return {
            abort: () => {},
            stream: async function* () {
              const id = await maybe
              const c = pool.find(x => x.id === id)
              if (!c) {
                throw new ConfigError({
                  code: ErrorCodes.AK_CONFIG_INVALID,
                  message: `policy returned unknown id: ${id}`,
                  hint: 'Custom policy functions must return one of the candidate ids.',
                })
              }
              options.onRoute?.({ id: c.id, reason: pickedBy ?? 'custom policy', request })
              for await (const chunk of c.adapter.createSource(request).stream()) yield chunk
            },
          }
        }
        const c = pool.find(x => x.id === maybe)
        if (!c) {
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
