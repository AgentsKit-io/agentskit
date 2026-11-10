/** Prompt value and relative allocation weight for one experiment choice. */
export interface PromptVariant<TResult = string> {
  /** Variant id — matches a feature-flag payload / flag value. */
  id: string
  /** The prompt value to serve when this variant is picked. */
  prompt: TResult
  /** Relative weight used by the default sticky-hash resolver. Default 1. */
  weight?: number
}

/** Optional subject identifier and metadata passed into variant resolution. */
export interface PromptExperimentContext {
  /**
   * Opaque stable identifier used for sticky assignment — user id,
   * session id, or any business key. Without this, resolution is
   * random-per-call (fine for smoke tests, bad for A/B cohorts).
   */
  subjectId?: string
  /** Pass-through metadata handed to custom resolvers. */
  metadata?: Record<string, unknown>
}

/** Function that selects a configured variant or returns a known variant id. */
export type PromptResolver<TResult = string> = (
  variants: PromptVariant<TResult>[],
  context: PromptExperimentContext,
) => PromptVariant<TResult> | Promise<PromptVariant<TResult>> | string | Promise<string>

/** Named experiment configuration with variant resolution and exposure hook. */
export interface PromptExperiment<TResult = string> {
  /** Experiment name — used by analytics / flag providers as the key. */
  name: string
  variants: PromptVariant<TResult>[]
  /**
   * Pick a variant. Plug in your feature-flag client
   * (PostHog / GrowthBook / Unleash / custom) here. If it throws or
   * returns an unknown id, the experiment falls back to the built-in
   * sticky-hash resolver.
   */
  resolve: PromptResolver<TResult>
  /** Fires on every resolution — feed your analytics pipeline. */
  onExposure?: (decision: {
    name: string
    variantId: string
    subjectId?: string
    fallback: boolean
  }) => void
}

/** Selected prompt variant and whether the resolver used its fallback. */
export interface PromptDecision<TResult = string> {
  name: string
  variantId: string
  prompt: TResult
  fallback: boolean
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h
}

/**
 * Deterministic sticky assignment: same `subjectId` always maps to
 * the same variant, weighted by `variant.weight`. When `subjectId`
 * is omitted, falls back to `Math.random()` — good enough for
 * smoke tests, not for production cohorts.
 */
export function stickyResolver<TResult = string>(): PromptResolver<TResult> {
  return (variants, context) => {
    const weights = variants.map(v => Math.max(0, v.weight ?? 1))
    const total = weights.reduce((a, b) => a + b, 0)
    if (total === 0) return variants[0]!
    const roll = context.subjectId
      ? (hashString(context.subjectId) % 10_000) / 10_000
      : Math.random()
    let acc = 0
    for (let i = 0; i < variants.length; i++) {
      acc += weights[i]! / total
      if (roll < acc) return variants[i]!
    }
    return variants[variants.length - 1]!
  }
}

/**
 * Build a prompt experiment. Call `.pick(context)` at the call site
 * to get the variant id + prompt; wire `resolve` to your flag
 * provider's variant-selection API (PostHog's `getFeatureFlagPayload`,
 * GrowthBook's `getFeatureValue`, etc.).
 */
export function createPromptExperiment<TResult = string>(
  config: PromptExperiment<TResult>,
): {
  pick: (context?: PromptExperimentContext) => Promise<PromptDecision<TResult>>
} {
  if (config.variants.length === 0) {
    throw new Error(`createPromptExperiment("${config.name}"): no variants`)
  }
  const fallback = stickyResolver<TResult>()

  return {
    async pick(context = {}) {
      let variantId: string | undefined
      let fellBack = false
      try {
        const decision = await config.resolve(config.variants, context)
        if (typeof decision === 'string') variantId = decision
        else variantId = decision?.id
      } catch {
        fellBack = true
      }

      let variant = config.variants.find(v => v.id === variantId)
      if (!variant) {
        fellBack = fellBack || variantId !== undefined
        const fb = await fallback(config.variants, context)
        variant = typeof fb === 'string' ? config.variants.find(v => v.id === fb) : fb
      }
      if (!variant) variant = config.variants[0]!

      config.onExposure?.({
        name: config.name,
        variantId: variant.id,
        subjectId: context.subjectId,
        fallback: fellBack,
      })

      return {
        name: config.name,
        variantId: variant.id,
        prompt: variant.prompt,
        fallback: fellBack,
      }
    },
  }
}

/**
 * Convenience resolver: maps your flag client's `getVariant(name,
 * subjectId) => string | undefined` signature directly into a
 * `PromptResolver`. Works with PostHog, GrowthBook, Unleash — anything
 * that returns a string variant id.
 */
export function flagResolver<TResult = string>(
  getVariant: (name: string, context: PromptExperimentContext) => string | undefined | Promise<string | undefined>,
  experimentName: string,
): PromptResolver<TResult> {
  return async (variants, context) => {
    const id = await getVariant(experimentName, context)
    const match = id ? variants.find(v => v.id === id) : undefined
    if (match) return match
    // Unknown / missing variant — throw to let the picker fall back
    // to its default sticky-hash resolver.
    throw new Error(`flag "${experimentName}" returned unknown variant: ${String(id)}`)
  }
}
