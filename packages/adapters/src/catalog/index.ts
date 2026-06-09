/**
 * `@agentskit/adapters/catalog` — data-driven provider/model metadata, adapted
 * from `models.dev` into AgentsKit's own schema and cached as a committed
 * snapshot. No runtime coupling to `models.dev`.
 *
 * Exposed as a subpath so consumers only pay the (large) snapshot's bundle cost
 * when they actually need the catalog.
 */
export type {
  CatalogModalities,
  CatalogModel,
  CatalogModelCost,
  CatalogModelLimit,
  CatalogProvider,
  CatalogSnapshot,
  CatalogSource,
} from './types'
export { catalogSnapshotSchema } from './schema'
export {
  catalog,
  catalogSource,
  getModel,
  getProvider,
  listOpenAICompatibleProviders,
  listProviders,
} from './loader'
export { applyOverrides, type CatalogOverrides } from './overrides'
export {
  CatalogDispatchError,
  type CatalogDispatchConfig,
  dispatchFromCatalog,
} from './dispatch'
export {
  type CatalogDriftReport,
  detectCatalogDrift,
  FIRST_CLASS_PROVIDERS,
} from './drift'
export {
  getCachedCost,
  type ResolveCostOptions,
  type ResolvedCost,
  resolveCost,
} from './pricing'
