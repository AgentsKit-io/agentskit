import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { computeStats, REPO_ROOT } from './compute-stats.mjs'
import {
  buildEcosystemClaims,
  parseEcosystemClaims,
  parseEcosystemManifest,
} from './lib/ecosystem-contract.mjs'

const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'ecosystem.json'), 'utf8'))

function changed(change) {
  const copy = structuredClone(manifest)
  change(copy)
  return copy
}

test('the canonical manifest describes every ecosystem product', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.equal(parsed.schemaVersion, 2)
  assert.deepEqual(
    parsed.products.map((product) => product.id),
    ['agentskit', 'registry', 'agentskit-chat', 'playbook', 'doc-bridge', 'code-review', 'akos'],
  )
  assert.equal(parsed.products.find((product) => product.id === 'code-review').surfaces.chat, 'none')
})

test('repository-native products do not need a Fumadocs or chat deployment', () => {
  const parsed = parseEcosystemManifest(manifest)
  const codeReview = parsed.products.find((product) => product.id === 'code-review')
  assert.equal(codeReview.surfaces.documentation, 'repository')
  // Code Review stays in the ecosystem catalog but is hidden from the shared header for now.
  assert.equal(codeReview.navigation.showInBar, false)
})

test('AKOS exposes only declared repository evidence', () => {
  const parsed = parseEcosystemManifest(manifest)
  const akos = parsed.products.find((product) => product.id === 'akos')
  assert.equal(akos.surfaces.stats, undefined)

  const claims = buildEcosystemClaims(manifest, computeStats())
  const akosClaims = claims.products.find((product) => product.productId === 'akos')
  assert.deepEqual(akosClaims.source, {
    type: 'repository',
    repo: 'AgentsKit-io/agentskit-os',
  })
  assert.equal(akosClaims.verification, 'declared')
  assert.deepEqual(akosClaims.claims, [])
})

test('global navigation keeps seven-product order; bar can hide early-stage tools', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.deepEqual(parsed.products.map((product) => product.navigation.order), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(
    parsed.products.filter((product) => product.navigation.showInBar).map((product) => product.id),
    ['agentskit', 'registry', 'agentskit-chat', 'playbook', 'doc-bridge', 'akos'],
  )
  assert.ok(parsed.products.filter((product) => product.id !== 'akos').every((product) => product.navigation.next.length === 6))
  assert.deepEqual(parsed.products.find((product) => product.id === 'akos').navigation.next, [])
})

test('the v1 compatibility projection remains aligned with v2 products', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.deepEqual(parsed.properties.map((property) => property.id), ['agentskit', 'registry', 'agentskit-chat', 'playbook', 'doc-bridge', 'code-review', 'akos'])
  assert.equal(parsed.properties[0].url, parsed.products[0].surfaces.home)
})

test('v1 compatibility drift is rejected', () => {
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.properties[0].tagline = 'stale' })),
    /must match the v2 product projection/,
  )
})

test('duplicate product identities are rejected', () => {
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.products[1].id = 'agentskit' })),
    /duplicates product id agentskit/,
  )
})

test('unknown cross-product navigation targets are rejected', () => {
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.products[0].navigation.next.push('missing') })),
    /references unknown product missing/,
  )
})

test('missing sibling destinations are rejected', () => {
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.products[1].navigation.next.pop() })),
    /must contain every other canonical product exactly once/,
  )
})

test('Fumadocs products require a documentation URL', () => {
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { delete copy.products[0].surfaces.docs })),
    /is required when documentation is fumadocs/,
  )
})

test('showcase numbers reference canonical claim sources instead of literals', () => {
  const parsed = parseEcosystemManifest(manifest)
  const agentskit = parsed.products.find((product) => product.id === 'agentskit')
  const registry = parsed.products.find((product) => product.id === 'registry')

  assert.equal(agentskit.showcase.claimSource.url, agentskit.surfaces.stats)
  assert.match(agentskit.showcase.proof, /\{\{packages\}\}/)
  assert.deepEqual(agentskit.showcase.sales.metrics.map((metric) => metric.value), [
    '{{catalog-providers}}',
    '{{native-adapters}}',
    '{{integrations}}',
  ])
  assert.equal(registry.showcase.claimSource.url, registry.surfaces.stats)
  assert.equal(registry.showcase.sales.metric, '{{agents}}')
  assert.match(registry.showcase.sales.capabilities.at(-1), /\{\{remaining-categories\}\}/)
})

test('showcase CTAs declare whether they open the product or its documentation', () => {
  const parsed = parseEcosystemManifest(manifest)
  const agentskit = parsed.products.find((product) => product.id === 'agentskit')
  const registry = parsed.products.find((product) => product.id === 'registry')

  assert.equal(agentskit.showcase.ctaSurface, 'docs')
  assert.equal(registry.showcase.ctaSurface, 'home')
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.products[1].showcase.ctaSurface = 'pricing' })),
    /must be one of: home, docs/,
  )
})

test('the generated showcase gives every visible product a recognizable mark', () => {
  const bar = readFileSync(join(REPO_ROOT, 'apps/docs-next/public/ecosystem-bar.js'), 'utf8')

  assert.match(bar, /var PRODUCT_ICONS =/)
  assert.match(bar, /akx-product-mark/)
  assert.match(bar, /PRODUCT_ICONS\[product\.id\]/)
  assert.ok(manifest.products.filter((product) => product.navigation.showInBar).every((product) => {
    return new RegExp(`['"]?${product.id}['"]?:`).test(bar)
  }))
})

test('showcase templates reject unknown claims and mismatched origins', () => {
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.products[0].showcase.proof = '{{missing}} packages' })),
    /references unknown showcase claim missing/,
  )
  assert.throws(
    () => parseEcosystemManifest(changed((copy) => { copy.products[0].showcase.claimSource.url = 'https://example.com/stats.json' })),
    /must match the product stats surface/,
  )
})

test('claims are deterministic and preserve exact repository-derived values', () => {
  const stats = computeStats()
  const first = buildEcosystemClaims(manifest, stats)
  const second = buildEcosystemClaims(manifest, stats)
  assert.deepEqual(first, second)

  const agentskit = first.products.find((product) => product.productId === 'agentskit')
  const packages = agentskit.claims.find((claim) => claim.id === 'packages')
  assert.equal(packages.value, stats.counts.packages)
  assert.equal(packages.evidence.path, 'scripts/compute-stats.mjs')
  assert.equal(first.products.length, manifest.products.length)
  assert.ok(first.products.filter((product) => product.productId !== 'agentskit').every((product) => product.claims.length === 0))
})

test('claims cannot reference unknown products', () => {
  const claims = buildEcosystemClaims(manifest, computeStats())
  claims.products[0].productId = 'missing'
  assert.throws(() => parseEcosystemClaims(claims, manifest), /references unknown product missing/)
})

test('declared products cannot publish claims before verification', () => {
  const claims = buildEcosystemClaims(manifest, computeStats())
  claims.products[1].claims.push(structuredClone(claims.products[0].claims[0]))
  assert.throws(() => parseEcosystemClaims(claims, manifest), /must be empty until the product is verified/)
})

test('claim evidence must belong to the product repository', () => {
  const claims = buildEcosystemClaims(manifest, computeStats())
  claims.products[0].claims[0].evidence.repo = 'AgentsKit-io/another-repo'
  assert.throws(() => parseEcosystemClaims(claims, manifest), /must match the product repository/)
})

test('conservative floors cannot exceed exact values', () => {
  const claims = buildEcosystemClaims(manifest, computeStats())
  const claim = claims.products[0].claims[0]
  claim.conservativeFloor = claim.value + 1
  assert.throws(() => parseEcosystemClaims(claims, manifest), /must be between zero and the exact value/)
})
