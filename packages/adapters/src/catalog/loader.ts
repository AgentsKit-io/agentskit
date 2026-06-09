import snapshotJson from './snapshot.json'
import type { CatalogModel, CatalogProvider, CatalogSnapshot } from './types'

/**
 * The committed catalog snapshot. Imported as data — the runtime never fetches
 * `models.dev`. Heavy (thousands of models), so this module is only reachable
 * via the `@agentskit/adapters/catalog` subpath, keeping the main bundle lean.
 */
export const catalog: CatalogSnapshot = snapshotJson as CatalogSnapshot

const providerIndex = new Map<string, CatalogProvider>(
  catalog.providers.map((p) => [p.id, p]),
)

/** All providers in the snapshot. */
export function listProviders(): CatalogProvider[] {
  return catalog.providers
}

/** Look up a provider by id (e.g. "openai", "deepseek"). */
export function getProvider(id: string): CatalogProvider | undefined {
  return providerIndex.get(id)
}

/** Look up a model within a provider. */
export function getModel(providerId: string, modelId: string): CatalogModel | undefined {
  return getProvider(providerId)?.models.find((m) => m.id === modelId)
}

/** Providers exposing an OpenAI-compatible transport (dispatchable natively). */
export function listOpenAICompatibleProviders(): CatalogProvider[] {
  return catalog.providers.filter((p) => p.openaiCompatible)
}

/** Snapshot freshness/provenance — surface this so consumers can reason about staleness. */
export function catalogSource(): CatalogSnapshot['source'] & { generatedAt: string } {
  return { ...catalog.source, generatedAt: catalog.generatedAt }
}
