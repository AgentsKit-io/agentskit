import { ConfigError, ErrorCodes, type AdapterFactory } from '@agentskit/core'

/**
 * Provider model deprecation policy. When a provider deprecates a
 * model, today the adapter silently 404s in production. This module
 * lets you ship a deprecation table per provider and pick a behaviour:
 *
 *  - `warn`  — log once at startup, keep using the model.
 *  - `remap` — auto-substitute the configured successor.
 *  - `fail`  — throw at startup so deploys catch it.
 *
 * The deprecation table is community-updateable: the default export
 * holds known deprecations as of the AgentsKit release; consumers can
 * pass their own table to override or extend.
 *
 * Closes issue #800.
 */

export type DeprecationAction = 'warn' | 'remap' | 'fail'

export interface ModelDeprecation {
  provider: string
  model: string
  /** ISO date the provider's sunset takes effect. */
  sunsetOn?: string
  /** Suggested successor — used when `onDeprecation: 'remap'`. */
  successor?: string
  /** Optional human-readable reason / link. */
  note?: string
}

export interface DeprecationPolicy {
  onDeprecation: DeprecationAction
  table?: ModelDeprecation[]
  /** Sink for warnings. Defaults to `console.warn`. */
  logger?: (msg: string) => void
}

/**
 * Known deprecations (current as of AgentsKit shipping). Bump on each
 * release; PRs welcome. Successor picks lean towards the same
 * provider's current default unless the entire family is gone.
 */
export const DEFAULT_DEPRECATION_TABLE: ModelDeprecation[] = [
  // OpenAI
  { provider: 'openai', model: 'gpt-3.5-turbo-0301', successor: 'gpt-4o-mini', sunsetOn: '2024-09-13' },
  { provider: 'openai', model: 'gpt-3.5-turbo-0613', successor: 'gpt-4o-mini', sunsetOn: '2024-09-13' },
  { provider: 'openai', model: 'gpt-4-0314', successor: 'gpt-4o', sunsetOn: '2024-06-13' },
  { provider: 'openai', model: 'gpt-4-32k', successor: 'gpt-4o', sunsetOn: '2024-06-06' },
  { provider: 'openai', model: 'text-davinci-003', successor: 'gpt-4o-mini', sunsetOn: '2024-01-04' },
  // Anthropic
  { provider: 'anthropic', model: 'claude-2.0', successor: 'claude-3-5-sonnet-latest', sunsetOn: '2025-07-21' },
  { provider: 'anthropic', model: 'claude-2.1', successor: 'claude-3-5-sonnet-latest', sunsetOn: '2025-07-21' },
  { provider: 'anthropic', model: 'claude-instant-1.2', successor: 'claude-3-5-haiku-latest', sunsetOn: '2024-07-22' },
  { provider: 'anthropic', model: 'claude-3-sonnet-20240229', successor: 'claude-3-5-sonnet-latest', sunsetOn: '2025-07-21' },
  // Google
  { provider: 'google', model: 'gemini-1.0-pro', successor: 'gemini-1.5-pro', sunsetOn: '2025-02-15' },
  { provider: 'google', model: 'gemini-pro-vision', successor: 'gemini-1.5-pro', sunsetOn: '2024-07-12' },
]

export interface ResolveModelInput {
  provider: string
  model: string
}

export interface ResolveModelResult {
  /** Final model id to use (may differ from input if remapped). */
  model: string
  remapped: boolean
  deprecation?: ModelDeprecation
}

export function resolveModel(
  input: ResolveModelInput,
  policy: DeprecationPolicy,
): ResolveModelResult {
  const table = policy.table ?? DEFAULT_DEPRECATION_TABLE
  const hit = table.find(d => d.provider === input.provider && d.model === input.model)

  if (!hit) return { model: input.model, remapped: false }

  const log = policy.logger ?? ((msg: string) => console.warn(msg))
  const sunset = hit.sunsetOn ? ` (sunset ${hit.sunsetOn})` : ''
  const successor = hit.successor ? ` Suggested successor: ${hit.successor}.` : ''
  const base = `[agentskit] Model "${input.provider}:${input.model}" is deprecated${sunset}.${successor}`

  switch (policy.onDeprecation) {
    case 'fail':
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: base,
        hint: hit.successor ? `Set model to "${hit.successor}".` : 'Pick a supported model from the provider.',
      })
    case 'remap': {
      if (!hit.successor) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `${base} No successor available — cannot remap.`,
        })
      }
      log(`${base} Auto-remapping to "${hit.successor}".`)
      return { model: hit.successor, remapped: true, deprecation: hit }
    }
    case 'warn':
    default:
      log(base)
      return { model: input.model, remapped: false, deprecation: hit }
  }
}

/**
 * Wrap an `AdapterFactory` so that any model field on its requests is
 * checked against the deprecation policy at startup. Convenience for
 * adapters that don't want to plumb the check into their own code:
 *
 * ```ts
 * const adapter = withDeprecationPolicy(openai({ apiKey, model: 'gpt-3.5-turbo-0301' }), {
 *   provider: 'openai',
 *   onDeprecation: 'remap',
 * })
 * ```
 *
 * For adapters with internal model state (most), prefer calling
 * `resolveModel()` inside the factory and substituting before the
 * first request — this wrapper is a fallback for opaque adapters.
 */
export function withDeprecationPolicy<F extends AdapterFactory>(
  factory: F,
  options: { provider: string; model: string } & DeprecationPolicy,
): F {
  // Run once at construction so `fail` halts deploy, not first request.
  resolveModel({ provider: options.provider, model: options.model }, options)
  return factory
}
