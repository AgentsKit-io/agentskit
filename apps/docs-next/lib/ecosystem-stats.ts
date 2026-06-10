/**
 * Ecosystem stats accessor for agentskit.io.
 *
 * For our OWN numbers we read the committed snapshot (generated from
 * compute-stats.ts via scripts/gen-stats-snapshot.mjs at prebuild). The snapshot
 * is plain JSON so it works in both server and client components.
 *
 * Sibling properties (akos / playbook / registry) expose the same shape at their
 * own /api/stats.json; fetchSiblingStats() pulls them at build with a graceful
 * fallback. Consumers must use these values — never hand-type a count in copy.
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

export interface EcosystemStats {
  schemaVersion: number
  property: string
  counts: EcosystemCounts
  coreSizeKbGzip: number
}

/** agentskit.io's own canonical counts. */
export const stats: EcosystemStats = snapshot as EcosystemStats
export const counts: EcosystemCounts = stats.counts

/** Format a count with a "+" suffix for the round/marketing-friendly ones. */
export function approx(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)},000+`
  if (n >= 100) return `${Math.floor(n / 10) * 10}+`
  if (n >= 20) return `${n}+`
  return String(n)
}

/**
 * Fetch a sibling property's stats at build time. Returns null on any failure;
 * callers should fall back to a sensible default rather than block the build.
 */
export async function fetchSiblingStats(url: string): Promise<EcosystemStats | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return (await res.json()) as EcosystemStats
  } catch {
    return null
  }
}
