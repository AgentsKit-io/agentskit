import { listProviders } from './loader'
import type { CatalogProvider } from './types'

/**
 * Catalog-backed providers that ship dedicated first-class factories here. These
 * are authoritative and intentionally NOT dispatched via the generic catalog path.
 *
 * `ollama` is also first-class but is deliberately excluded: it is local-only and
 * absent from `models.dev`, so it must not be flagged as "missing from catalog".
 */
export const FIRST_CLASS_PROVIDERS = ['anthropic', 'openai', 'google'] as const

export interface CatalogDriftReport {
  /** Catalog providers that are neither first-class nor OpenAI-compatible — undispatchable. */
  undispatchable: string[]
  /** First-class provider ids with no matching catalog entry (rename/removal upstream). */
  missingFromCatalog: string[]
  /** True when every catalog provider can be dispatched and no first-class entry is missing. */
  ok: boolean
}

/**
 * Drift check: every snapshot provider must map to a dispatchable adapter (first-class
 * factory or native OpenAI-compatible) or be flagged. Run in CI so a regenerated
 * snapshot that introduces an unroutable provider fails loudly instead of shipping silently.
 */
export function detectCatalogDrift(
  providers: CatalogProvider[] = listProviders(),
): CatalogDriftReport {
  const firstClass = new Set<string>(FIRST_CLASS_PROVIDERS)
  const undispatchable = providers
    .filter((p) => !p.openaiCompatible && !firstClass.has(p.id))
    .map((p) => p.id)
  const ids = new Set(providers.map((p) => p.id))
  const missingFromCatalog = FIRST_CLASS_PROVIDERS.filter((id) => !ids.has(id))
  return {
    undispatchable,
    missingFromCatalog,
    ok: undispatchable.length === 0 && missingFromCatalog.length === 0,
  }
}
