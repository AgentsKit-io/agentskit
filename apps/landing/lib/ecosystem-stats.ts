/**
 * Ecosystem counts for the landing app. Reads the committed snapshot generated
 * from the canonical derivation (scripts/compute-stats.mjs via
 * scripts/gen-ecosystem-stats.mjs at prebuild). Never hand-type a count in copy.
 */
import snapshot from './ecosystem-stats.snapshot.json'

export interface EcosystemCounts {
  packages: number
  frameworkBindings: number
  nativeAdapters: number
  integrations: number
  catalogProviders: number
  catalogModels: number
  skills: number
  memoryBackends: number
  recipes: number
}

export const counts: EcosystemCounts = (snapshot as { counts: EcosystemCounts }).counts
