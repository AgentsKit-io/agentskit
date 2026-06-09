/**
 * AgentsKit provider/model catalog — normalized metadata adapted from the
 * `models.dev` data source into our own schema. This is the canonical shape;
 * `models.dev` is an input, never a runtime dependency (see {@link CatalogSnapshot.source}).
 */

/** Input/output modalities a model accepts/produces. */
export interface CatalogModalities {
  input: string[]
  output: string[]
}

/**
 * Per-token cost in USD per 1M tokens. Advisory metadata only — it is cached at
 * snapshot time and drifts between regenerations, so never treat it as a hard
 * contract for billing.
 */
export interface CatalogModelCost {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
}

/** Context / output token ceilings. */
export interface CatalogModelLimit {
  context?: number
  output?: number
}

/** A single model entry within a provider. */
export interface CatalogModel {
  id: string
  name: string
  family?: string
  limit?: CatalogModelLimit
  cost?: CatalogModelCost
  modalities?: CatalogModalities
  /** Capability flags — consult these instead of assuming "openai-compatible = works". */
  toolCall: boolean
  structuredOutput: boolean
  reasoning: boolean
  attachment: boolean
  openWeights: boolean
  /** ISO-ish knowledge cutoff (e.g. "2024-05"). */
  knowledge?: string
  releaseDate?: string
  lastUpdated?: string
  deprecated?: boolean
}

/** A provider and its models. */
export interface CatalogProvider {
  id: string
  name: string
  /** Environment variable names that hold this provider's API key. */
  env: string[]
  /** Default API base URL (when `models.dev` records one). */
  baseUrl?: string
  doc?: string
  /**
   * True when the provider exposes an OpenAI-compatible transport and can be
   * dispatched via the native generic adapter rather than a bespoke factory.
   */
  openaiCompatible: boolean
  models: CatalogModel[]
}

/** Provenance + freshness metadata for a generated snapshot. */
export interface CatalogSource {
  name: 'models.dev'
  url: string
  /** Pinned upstream version/commit the snapshot was generated from. */
  version: string
}

/** The committed, schema-validated catalog artifact loaded at runtime. */
export interface CatalogSnapshot {
  schemaVersion: 1
  /** ISO timestamp the snapshot was generated (set by the sync tool). */
  generatedAt: string
  source: CatalogSource
  providers: CatalogProvider[]
}
