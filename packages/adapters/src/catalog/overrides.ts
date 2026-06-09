import type { CatalogProvider, CatalogSnapshot } from './types'

/**
 * Local policy layer so consumers can constrain the catalog without forking it
 * (enterprise-approved providers/models, disabled providers, etc.).
 *
 * Precedence (most → least restrictive):
 *  1. `disabledProviders` always removes a provider, even if allow-listed.
 *  2. `allowedProviders`, when set, keeps only listed providers.
 *  3. `allowedModels[providerId]`, when set, keeps only listed models for that provider.
 */
export interface CatalogOverrides {
  /** When set, only these provider ids survive. */
  allowedProviders?: string[]
  /** Always removed, takes precedence over `allowedProviders`. */
  disabledProviders?: string[]
  /** Per-provider model allow-list. Absent provider key = no model restriction. */
  allowedModels?: Record<string, string[]>
}

function applyToProvider(
  provider: CatalogProvider,
  overrides: CatalogOverrides,
): CatalogProvider | undefined {
  if (overrides.disabledProviders?.includes(provider.id)) return undefined
  if (overrides.allowedProviders && !overrides.allowedProviders.includes(provider.id)) {
    return undefined
  }
  const allowedModels = overrides.allowedModels?.[provider.id]
  if (!allowedModels) return provider
  const allowed = new Set(allowedModels)
  return { ...provider, models: provider.models.filter((m) => allowed.has(m.id)) }
}

/** Return a new snapshot with policy applied. The input snapshot is not mutated. */
export function applyOverrides(
  snapshot: CatalogSnapshot,
  overrides: CatalogOverrides,
): CatalogSnapshot {
  const providers = snapshot.providers
    .map((p) => applyToProvider(p, overrides))
    .filter((p): p is CatalogProvider => p !== undefined)
  return { ...snapshot, providers }
}
