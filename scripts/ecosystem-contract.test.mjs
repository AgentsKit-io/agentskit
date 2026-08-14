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

test('distribution classes make the open-source family and managed AKOS layer explicit', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.ok(parsed.products.filter((product) => product.id !== 'akos').every((product) => {
    return product.public === true && product.distributionClass === 'open-source'
  }))
  const akos = parsed.products.find((product) => product.id === 'akos')
  assert.equal(akos.public, false)
  assert.equal(akos.distributionClass, 'managed-service')
  assert.equal(akos.repo, null)
  assert.deepEqual(akos.aliases, ['AgentsKit OS'])
})

test('the repository llms index uses absolute URLs and explicit product labels', () => {
  const index = readFileSync(join(REPO_ROOT, 'llms.txt'), 'utf8')
  assert.doesNotMatch(index, /\]\((?:apps|docs|packages)\//)
  assert.doesNotMatch(index, /\[(?:peer|peers|or):\]/)
  assert.match(index, /\[AKOS\]\(https:\/\/akos\.agentskit\.io\/?/)
  assert.match(index, /not required to use the open-source products/)
})

test('repository-native products do not need a Fumadocs or chat deployment', () => {
  const parsed = parseEcosystemManifest(manifest)
  const codeReview = parsed.products.find((product) => product.id === 'code-review')
  assert.equal(codeReview.surfaces.documentation, 'repository')
  // Code Review stays in the ecosystem catalog but is hidden from the shared header for now.
  assert.equal(codeReview.navigation.showInBar, false)
})

test('primary surfaces expose server-rendered ecosystem links', () => {
  const docsLayout = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/layout.tsx'), 'utf8')
  const registryShowcase = readFileSync(join(REPO_ROOT, 'apps/registry/app/(home)/_components/ecosystem-showcase.tsx'), 'utf8')
  assert.match(docsLayout, /<footer[\s\S]*aria-label="AgentsKit ecosystem"/)
  assert.match(docsLayout, /FOOTER_PRODUCTS/)
  assert.match(registryShowcase, /<nav aria-label="AgentsKit ecosystem"/)
  assert.match(registryShowcase, /ecosystemPeers\.map/)
  const registryMesh = readFileSync(join(REPO_ROOT, 'apps/registry/app/(home)/_components/ecosystem-mesh.tsx'), 'utf8')
  assert.match(registryMesh, /ecosystem\.json/)
  assert.doesNotMatch(registryMesh, /href:\s*['"]https:\/\//)
  const landingEcosystem = readFileSync(join(REPO_ROOT, 'apps/landing/app/_components/ecosystem.tsx'), 'utf8')
  assert.match(landingEcosystem, /ecosystem\.json/)
  assert.match(landingEcosystem, /distributionClass === 'managed-service'/)
})

test('registry home exposes the real agent collection in JSON-LD', () => {
  const registryHome = readFileSync(join(REPO_ROOT, 'apps/registry/app/(home)/page.tsx'), 'utf8')
  assert.match(registryHome, /'@type': 'CollectionPage'/)
  assert.match(registryHome, /'@type': 'ItemList'/)
  assert.match(registryHome, /agents\.map\(\(agent, index\)/)
  assert.match(registryHome, /encodeURIComponent\(agent\.id\)/)
})

test('docs home labels AKOS as an optional managed layer', () => {
  const docsHome = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/(home)/page.tsx'), 'utf8')
  assert.match(docsHome, /AKOS · optional managed/)
  assert.doesNotMatch(docsHome, /AKOS · production OS/)
})

test('the canonical ecosystem hub is included in the docs sitemap', () => {
  const sitemap = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/sitemap.ts'), 'utf8')
  assert.match(sitemap, /\$\{SITE\}\/ecosystem/)
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
  assert.deepEqual(parsed.properties.map((property) => property.id), ['agentskit', 'akos', 'playbook', 'registry'])
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

test('managed products use declaration sources without exposing a repository', () => {
  const claims = buildEcosystemClaims(manifest, computeStats())
  const akos = claims.products.find((product) => product.productId === 'akos')
  assert.deepEqual(akos.source, {
    type: 'declaration',
    summary: 'Public commercial references only; never use private implementation as contribution evidence.',
  })
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
