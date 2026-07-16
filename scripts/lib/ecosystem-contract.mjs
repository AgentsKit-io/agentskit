const MATURITY = new Set(['planning', 'alpha', 'beta', 'stable', 'deprecated'])
const DOCUMENTATION_MODES = new Set(['fumadocs', 'repository'])
const CHAT_MODES = new Set(['agentschat', 'custom', 'none'])
const SURFACE_KEYS = ['home', 'docs', 'llms', 'stats']
/** v1 properties array tracks the full seven-product set (expanded from original four). */
/** Deprecated v1 four-product shim — products[] is the seven-product catalog. */
const LEGACY_PRODUCT_IDS = ['agentskit', 'akos', 'playbook', 'registry']
const CANONICAL_PRODUCT_IDS = ['agentskit', 'registry', 'agentskit-chat', 'playbook', 'doc-bridge', 'code-review', 'akos']

function fail(path, message) {
  throw new TypeError(`ecosystem contract: ${path} ${message}`)
}

function object(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object')
  return value
}

function string(value, path) {
  if (typeof value !== 'string' || value.trim() === '') fail(path, 'must be a non-empty string')
  return value
}

function url(value, path) {
  string(value, path)
  let parsed
  try { parsed = new URL(value) } catch { fail(path, 'must be an absolute URL') }
  if (parsed.protocol !== 'https:') fail(path, 'must use https')
  return value
}

function enumValue(value, allowed, path) {
  string(value, path)
  if (!allowed.has(value)) fail(path, `must be one of: ${[...allowed].join(', ')}`)
  return value
}

function integer(value, path) {
  if (!Number.isSafeInteger(value)) fail(path, 'must be a safe integer')
  return value
}

function optionalUrl(container, key, path) {
  if (container[key] !== undefined) url(container[key], `${path}.${key}`)
}

export function parseEcosystemManifest(input) {
  const manifest = object(input, '$')
  if (manifest.schemaVersion !== 2) fail('$.schemaVersion', 'must equal 2')

  const parentBrand = object(manifest.parentBrand, '$.parentBrand')
  string(parentBrand.id, '$.parentBrand.id')
  string(parentBrand.name, '$.parentBrand.name')

  if (!Array.isArray(manifest.products) || manifest.products.length === 0) {
    fail('$.products', 'must be a non-empty array')
  }

  const ids = new Set()
  const navOrders = new Set()
  for (const [index, raw] of manifest.products.entries()) {
    const path = `$.products[${index}]`
    const product = object(raw, path)
    const id = string(product.id, `${path}.id`)
    if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(`${path}.id`, 'must be a lowercase slug')
    if (ids.has(id)) fail(`${path}.id`, `duplicates product id ${id}`)
    ids.add(id)

    string(product.name, `${path}.name`)
    string(product.shortName, `${path}.shortName`)
    string(product.kind, `${path}.kind`)
    string(product.role, `${path}.role`)
    string(product.promise, `${path}.promise`)
    enumValue(product.maturity, MATURITY, `${path}.maturity`)
    const repo = string(product.repo, `${path}.repo`)
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) fail(`${path}.repo`, 'must use owner/name')
    const accent = string(product.accent, `${path}.accent`)
    if (!/^#[0-9A-Fa-f]{6}$/.test(accent)) fail(`${path}.accent`, 'must be a six-digit hex color')

    const surfaces = object(product.surfaces, `${path}.surfaces`)
    enumValue(surfaces.documentation, DOCUMENTATION_MODES, `${path}.surfaces.documentation`)
    enumValue(surfaces.chat, CHAT_MODES, `${path}.surfaces.chat`)
    for (const key of SURFACE_KEYS) optionalUrl(surfaces, key, `${path}.surfaces`)
    if (surfaces.documentation === 'fumadocs' && surfaces.docs === undefined) {
      fail(`${path}.surfaces.docs`, 'is required when documentation is fumadocs')
    }

    const navigation = object(product.navigation, `${path}.navigation`)
    if (typeof navigation.showInBar !== 'boolean') fail(`${path}.navigation.showInBar`, 'must be a boolean')
    if (navigation.showInBar) {
      if (surfaces.home === undefined) fail(`${path}.surfaces.home`, 'is required for shared navigation')
      integer(navigation.order, `${path}.navigation.order`)
      if (navigation.order < 0) fail(`${path}.navigation.order`, 'must be zero or greater')
      if (navOrders.has(navigation.order)) fail(`${path}.navigation.order`, `duplicates navigation order ${navigation.order}`)
      navOrders.add(navigation.order)
    }
    if (!Array.isArray(navigation.next)) fail(`${path}.navigation.next`, 'must be an array')
    const nextIds = new Set()
    for (const [nextIndex, nextId] of navigation.next.entries()) {
      string(nextId, `${path}.navigation.next[${nextIndex}]`)
      if (nextId === id) fail(`${path}.navigation.next[${nextIndex}]`, 'cannot reference the same product')
      if (nextIds.has(nextId)) fail(`${path}.navigation.next[${nextIndex}]`, `duplicates ${nextId}`)
      nextIds.add(nextId)
    }
  }

  for (const [index, product] of manifest.products.entries()) {
    for (const [nextIndex, nextId] of product.navigation.next.entries()) {
      if (!ids.has(nextId)) fail(`$.products[${index}].navigation.next[${nextIndex}]`, `references unknown product ${nextId}`)
    }
  }

  if (JSON.stringify([...ids]) !== JSON.stringify(CANONICAL_PRODUCT_IDS)) {
    fail('$.products', `must contain the canonical products in order: ${CANONICAL_PRODUCT_IDS.join(', ')}`)
  }
  for (const [index, product] of manifest.products.entries()) {
    // Products may set showInBar:false to leave the shared header (e.g. early-stage tools).
    // Order stays stable so re-enabling a product does not reshuffle peers.
    if (product.navigation.order !== index) fail(`$.products[${index}].navigation.order`, `must equal ${index}`)
    const expectedPeers = product.id === 'akos'
      ? []
      : CANONICAL_PRODUCT_IDS.filter((id) => id !== product.id).sort()
    const actualPeers = [...product.navigation.next].sort()
    if (JSON.stringify(actualPeers) !== JSON.stringify(expectedPeers)) {
      fail(`$.products[${index}].navigation.next`, product.id === 'akos'
        ? 'must be empty because AKOS is excluded from the continuation component'
        : 'must contain every other canonical product exactly once')
    }
  }

  if (!Array.isArray(manifest.properties)) fail('$.properties', 'must preserve the v1 compatibility array')
  if (manifest.properties.length !== LEGACY_PRODUCT_IDS.length) {
    fail('$.properties', `must contain the ${LEGACY_PRODUCT_IDS.length} v1 products`)
  }
  for (const [index, legacyId] of LEGACY_PRODUCT_IDS.entries()) {
    const path = `$.properties[${index}]`
    const property = object(manifest.properties[index], path)
    if (property.id !== legacyId) fail(`${path}.id`, `must equal ${legacyId}`)
    const product = manifest.products.find((candidate) => candidate.id === legacyId)
    if (!product) fail(`${path}.id`, `references missing v2 product ${legacyId}`)
    const expected = {
      name: product.name,
      barLabel: product.shortName,
      domain: new URL(product.surfaces.home).host,
      url: product.surfaces.home,
      repo: product.repo,
      tagline: product.promise,
      kind: product.kind,
      accent: product.accent,
      llms: product.surfaces.llms,
      stats: product.surfaces.stats,
    }
    for (const [key, value] of Object.entries(expected)) {
      if (property[key] !== value) fail(`${path}.${key}`, 'must match the v2 product projection')
    }
  }

  if (manifest.builder !== undefined) {
    const builder = object(manifest.builder, '$.builder')
    string(builder.id, '$.builder.id')
    string(builder.name, '$.builder.name')
    url(builder.url, '$.builder.url')
  }

  return manifest
}

const CLAIM_DEFINITIONS = [
  ['packages', 'packages', 'counts.packages', 'Published non-private @agentskit/* package directories.'],
  ['framework-bindings', 'framework bindings', 'counts.frameworkBindings', 'Published framework bindings from the supported binding list.'],
  ['native-adapters', 'native adapters', 'counts.nativeAdapters', 'Provider exports in the adapters package excluding composition helpers.'],
  ['integrations', 'integrations', 'counts.integrations', 'Service directories in the integrations catalog.'],
  ['catalog-providers', 'providers', 'counts.catalogProviders', 'Providers in the committed model catalog snapshot.'],
  ['catalog-models', 'models', 'counts.catalogModels', 'Models in the committed provider catalog snapshot.'],
  ['skills', 'ready-made skills', 'counts.skills', 'Concrete skill modules excluding registry and composition helpers.'],
  ['memory-backends', 'memory backends', 'counts.memoryBackends', 'Concrete memory modules excluding contracts and helpers.'],
  ['recipes', 'recipes', 'counts.recipes', 'Published recipe MDX pages excluding indexes and metadata.'],
  ['core-size-kb-gzip', 'KB gzipped core budget', 'coreSizeKbGzip', 'Configured ESM gzip size budget for @agentskit/core.'],
]

function valueAt(stats, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], stats)
}

function conservativeFloor(value) {
  if (!Number.isSafeInteger(value)) return undefined
  if (value >= 1000) return Math.floor(value / 1000) * 1000
  if (value >= 100) return Math.floor(value / 10) * 10
  if (value >= 20) return value
  return undefined
}

export function buildEcosystemClaims(manifestInput, stats) {
  const manifest = parseEcosystemManifest(manifestInput)
  const agentskit = manifest.products.find((product) => product.id === 'agentskit')
  if (!agentskit) fail('$.products', 'must include agentskit to derive local claims')

  const products = manifest.products.map((product) => ({
    productId: product.id,
    source: product.surfaces.stats
      ? { type: 'endpoint', url: product.surfaces.stats }
      : { type: 'repository', repo: product.repo },
    verification: product.id === 'agentskit' ? 'verified' : 'declared',
    claims: product.id === 'agentskit'
      ? CLAIM_DEFINITIONS.map(([id, noun, statsPath, summary]) => {
          const value = valueAt(stats, statsPath)
          if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            fail(`$.stats.${statsPath}`, 'must be a finite non-negative number')
          }
          const floor = conservativeFloor(value)
          return {
            id,
            value,
            noun,
            ...(floor === undefined ? {} : { conservativeFloor: floor }),
            evidence: {
              type: 'repository-derivation',
              repo: agentskit.repo,
              path: 'scripts/compute-stats.mjs',
              summary,
            },
          }
        })
      : [],
  }))

  return parseEcosystemClaims({
    schemaVersion: 1,
    manifestSchemaVersion: manifest.schemaVersion,
    products,
  }, manifest)
}

export function parseEcosystemClaims(input, manifestInput) {
  const claims = object(input, '$')
  if (claims.schemaVersion !== 1) fail('$.schemaVersion', 'must equal 1')
  if (claims.manifestSchemaVersion !== 2) fail('$.manifestSchemaVersion', 'must equal 2')
  const manifest = parseEcosystemManifest(manifestInput)
  const productIds = new Set(manifest.products.map((product) => product.id))
  if (!Array.isArray(claims.products)) fail('$.products', 'must be an array')

  const seenProducts = new Set()
  const seenClaims = new Set()
  for (const [productIndex, raw] of claims.products.entries()) {
    const path = `$.products[${productIndex}]`
    const product = object(raw, path)
    const productId = string(product.productId, `${path}.productId`)
    if (!productIds.has(productId)) fail(`${path}.productId`, `references unknown product ${productId}`)
    if (seenProducts.has(productId)) fail(`${path}.productId`, `duplicates product ${productId}`)
    seenProducts.add(productId)
    enumValue(product.verification, new Set(['verified', 'declared']), `${path}.verification`)
    const manifestProduct = manifest.products.find((candidate) => candidate.id === productId)

    const source = object(product.source, `${path}.source`)
    enumValue(source.type, new Set(['endpoint', 'repository']), `${path}.source.type`)
    if (source.type === 'endpoint') {
      url(source.url, `${path}.source.url`)
      if (source.url !== manifestProduct.surfaces.stats) {
        fail(`${path}.source.url`, 'must match the product stats surface')
      }
    } else {
      string(source.repo, `${path}.source.repo`)
      if (source.repo !== manifestProduct.repo) fail(`${path}.source.repo`, 'must match the product repository')
    }

    if (!Array.isArray(product.claims)) fail(`${path}.claims`, 'must be an array')
    if (product.verification === 'declared' && product.claims.length > 0) {
      fail(`${path}.claims`, 'must be empty until the product is verified')
    }
    for (const [claimIndex, rawClaim] of product.claims.entries()) {
      const claimPath = `${path}.claims[${claimIndex}]`
      const claim = object(rawClaim, claimPath)
      const id = string(claim.id, `${claimPath}.id`)
      const key = `${productId}:${id}`
      if (seenClaims.has(key)) fail(`${claimPath}.id`, `duplicates claim ${key}`)
      seenClaims.add(key)
      if (typeof claim.value !== 'number' || !Number.isFinite(claim.value) || claim.value < 0) {
        fail(`${claimPath}.value`, 'must be a finite non-negative number')
      }
      string(claim.noun, `${claimPath}.noun`)
      if (claim.conservativeFloor !== undefined) {
        integer(claim.conservativeFloor, `${claimPath}.conservativeFloor`)
        if (claim.conservativeFloor < 0 || claim.conservativeFloor > claim.value) {
          fail(`${claimPath}.conservativeFloor`, 'must be between zero and the exact value')
        }
      }
      const evidence = object(claim.evidence, `${claimPath}.evidence`)
      enumValue(evidence.type, new Set(['repository-derivation', 'endpoint']), `${claimPath}.evidence.type`)
      string(evidence.summary, `${claimPath}.evidence.summary`)
      if (evidence.type === 'repository-derivation') {
        string(evidence.repo, `${claimPath}.evidence.repo`)
        string(evidence.path, `${claimPath}.evidence.path`)
        if (evidence.repo !== manifestProduct.repo) {
          fail(`${claimPath}.evidence.repo`, 'must match the product repository')
        }
      } else {
        url(evidence.url, `${claimPath}.evidence.url`)
      }
    }
  }

  if (seenProducts.size !== productIds.size) fail('$.products', 'must include every manifest product exactly once')
  return claims
}
