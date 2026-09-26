import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transformSync } from 'esbuild'
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
    ['agentskit', 'registry', 'agentskit-chat', 'doc-bridge', 'code-review', 'harness', 'playbook'],
  )
  assert.equal(parsed.products.find((product) => product.id === 'code-review').surfaces.chat, 'none')
})

test('distribution classes keep the catalog open source', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.ok(parsed.products.every((product) => {
    return product.public === true && product.distributionClass === 'open-source'
  }))
})

test('the repository llms index uses absolute URLs and explicit product labels', () => {
  const index = readFileSync(join(REPO_ROOT, 'llms.txt'), 'utf8')
  assert.doesNotMatch(index, /\]\((?:apps|docs|packages)\//)
  assert.doesNotMatch(index, /\[(?:peer|peers|or):\]/)
  assert.doesNotMatch(index, /A\x4BOS/i)
})

test('repository-native products do not need a Fumadocs or chat deployment', () => {
  const parsed = parseEcosystemManifest(manifest)
  const codeReview = parsed.products.find((product) => product.id === 'code-review')
  assert.equal(codeReview.surfaces.documentation, 'fumadocs')
  assert.equal(codeReview.navigation.showInBar, true)
  assert.equal(codeReview.surfaces.home, 'https://code-review.agentskit.io')
})

test('primary surfaces expose server-rendered ecosystem links', () => {
  const docsLayout = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/layout.tsx'), 'utf8')
  const registryLayout = readFileSync(join(REPO_ROOT, 'apps/registry/app/layout.tsx'), 'utf8')
  const registryShowcase = readFileSync(join(REPO_ROOT, 'apps/registry/app/(home)/_components/ecosystem-showcase.tsx'), 'utf8')
  assert.match(docsLayout, /<EcosystemFooter \/>/)
  assert.match(registryLayout, /<EcosystemFooter \/>/)
  for (const rel of ['apps/docs-next/components/site-shell/ecosystem-footer.tsx', 'apps/registry/components/ecosystem-footer.tsx']) {
    const footer = readFileSync(join(REPO_ROOT, rel), 'utf8')
    assert.match(footer, /'agentskit-footer'/)
    assert.match(footer, /<nav aria-label="AgentsKit ecosystem"/)
    assert.match(footer, /navigation\.showInBar/)
    assert.match(footer, /slot="local"/)
  }
  assert.match(registryShowcase, /<nav aria-label="AgentsKit ecosystem"/)
  assert.match(registryShowcase, /ecosystemPeers\.filter\(\(peer\) => peer\.showInBar\)\.map/)
  const registryMesh = readFileSync(join(REPO_ROOT, 'apps/registry/app/(home)/_components/ecosystem-mesh.tsx'), 'utf8')
  assert.match(registryMesh, /ecosystem\.json/)
  assert.doesNotMatch(registryMesh, /href:\s*['"]https:\/\//)
  const landingEcosystem = readFileSync(join(REPO_ROOT, 'apps/landing/app/_components/ecosystem.tsx'), 'utf8')
  assert.match(landingEcosystem, /ecosystem\.json/)
  assert.match(landingEcosystem, /product\.public/)
})

test('registry catalog exposes the real agent collection in JSON-LD', () => {
  const registryCatalog = readFileSync(join(REPO_ROOT, 'apps/registry/app/agents/page.tsx'), 'utf8')
  assert.match(registryCatalog, /'@type': 'CollectionPage'/)
  assert.match(registryCatalog, /'@type': 'ItemList'/)
  assert.match(registryCatalog, /agents\.map\(\(agent, index\)/)
  assert.match(registryCatalog, /\/agents\/\$\{agent\.id\}/)
})

test('docs home has no retired product label', () => {
  const docsHome = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/(home)/page.tsx'), 'utf8')
  assert.doesNotMatch(docsHome, /A\x4BOS|AgentsKit\x20OS/)
})

test('the canonical ecosystem hub is included in the docs sitemap', () => {
  const sitemap = readFileSync(join(REPO_ROOT, 'apps/docs-next/app/sitemap.ts'), 'utf8')
  assert.match(sitemap, /\$\{SITE\}\/ecosystem/)
})

test('global navigation keeps the public product order', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.deepEqual(parsed.products.map((product) => product.navigation.order), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(
    parsed.products.filter((product) => product.navigation.showInBar).map((product) => product.id),
    ['agentskit', 'registry', 'agentskit-chat', 'doc-bridge', 'code-review', 'harness'],
  )
  assert.ok(parsed.products.every((product) => product.navigation.next.length === 6))
})

test('the v1 compatibility projection remains aligned with v2 products', () => {
  const parsed = parseEcosystemManifest(manifest)
  assert.deepEqual(parsed.properties.map((property) => property.id), ['agentskit', 'playbook', 'registry'])
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

const SHELL = readFileSync(join(REPO_ROOT, 'apps/docs-next/shell/v1.js'), 'utf8')

function shellBlock(name) {
  const match = SHELL.match(new RegExp(`ecobar:${name}-start[^\\n]*\\n([\\s\\S]*?)\\n\\s*// ecobar:${name}-end`))
  assert.ok(match, `shell block ${name} is missing`)
  return match[1]
}

test('shell v1 lists exactly the six bar products in the fixed order', () => {
  const ids = [...shellBlock('props').matchAll(/\{ id: "([^"]+)"/g)].map((match) => match[1])
  assert.deepEqual(ids, ['agentskit', 'registry', 'agentskit-chat', 'doc-bridge', 'code-review', 'harness'])
  const tour = JSON.parse(shellBlock('showcase').replace(/^\s*var SHOWCASE_PRODUCTS = /, ''))
  assert.deepEqual(tour.map((product) => product.id), ids)
  assert.doesNotMatch(shellBlock('props') + shellBlock('showcase'), /playbook|Playbook/)
})

test('shell v1 resolves Playbook only through the catalog for its Star target', () => {
  const catalog = JSON.parse(shellBlock('catalog').replace(/^\s*var CATALOG = /, ''))
  assert.equal(catalog.playbook.repo, 'AgentsKit-io/agents-playbook')
  assert.equal(Object.keys(catalog).length, manifest.products.length)
  assert.match(SHELL, /var currentRepo = safeRepo\(currentRepoOverride\) \|\| safeRepo\(repoFor\(current\)\)/)
  // Attribute-supplied repos and links are validated before reaching href (CodeQL js/xss-through-dom).
  assert.match(SHELL, /function safeRepo\(value\)/)
  assert.match(SHELL, /function safeHref\(value\)/)
})

test('shell v1 defines the bar, tour, footer, and aurora', () => {
  for (const name of ['agentskit-ecosystem', 'agentskit-footer', 'agentskit-aurora']) {
    assert.match(SHELL, new RegExp(`customElements\\.define\\('${name}'`))
  }
  assert.match(SHELL, /bar\.id = 'ak-eco'/)
  assert.match(SHELL, /this\.getAttribute\('license'\) \|\| 'MIT License'/)
  assert.match(SHELL, /prefers-color-scheme: dark/)
  assert.doesNotMatch(SHELL, /setAttribute\('data-upgraded'/)
  assert.match(SHELL, /querySelector\('\[data-ak-surface\]'\)/)
  assert.match(SHELL, /attributeFilter: \['data-ak-surface'\]/)
  assert.match(SHELL, /background-size:64px 64px/)
  assert.match(SHELL, /:host\(\[grid="off"\]\) \.aka-grid\{display:none\}/)
  assert.match(SHELL, /prefers-reduced-motion: reduce/)
  const css = readFileSync(join(REPO_ROOT, 'apps/docs-next/shell/v1.css'), 'utf8')
  assert.match(css, /\.ak-product-wordmark__product/)
  assert.doesNotMatch(css, /^@import/m)
  assert.match(css, /--ak-graphite: #57606a/)
  assert.match(css, /--ak-graphite: #8b949e/)
  assert.match(SHELL, /data-ak-fonts'\) === 'self'/)
  assert.match(SHELL, /sheet\.media = 'print'/)
  assert.match(SHELL, /display=swap/)
  assert.match(SHELL, /requestIdleCallback\(initShader/)
  assert.doesNotMatch(SHELL, /var syncGrid = function \(\) \{[^}]*scrollHeight/)
  assert.doesNotMatch(SHELL, /var\(--ak-graphite,#/)
  assert.match(SHELL, /'Pause tour of the ecosystem'/)
  assert.match(SHELL, /failIfMajorPerformanceCaveat: true/)
  assert.match(SHELL, /SwiftShader\|llvmpipe\|softpipe\|Software\|Basic Render/)
  assert.match(SHELL, /\(window\.devicePixelRatio \|\| 1\) \* 0\.5/)
  assert.match(SHELL, /document\.addEventListener\('visibilitychange', syncMotion\)/)
  assert.match(SHELL, /whenIdle\(function \(\) \{\n\s*registerFooter\(\)\n\s*registerEcosystemShowcase\(\)\n\s*registerAurora\(\)/)
  assert.match(css, /body::before \{[^}]*height: 57px/)
  assert.match(css, /body:has\(> #ak-eco\)::before \{\n\s*display: none;/)
  assert.match(SHELL, /'Play tour of the ecosystem'/)
})

test('the served shell is the minified build of the source, and no app keeps a copy', () => {
  const served = readFileSync(join(REPO_ROOT, 'apps/docs-next/public/shell/v1.js'), 'utf8')
  const expected = transformSync(SHELL, { loader: 'js', minify: true, target: 'es2018', legalComments: 'none', banner: '/*! AgentsKit shell v1 — generated from https://github.com/AgentsKit-io/agentskit/blob/main/apps/docs-next/shell/v1.js */' }).code
  assert.equal(served, expected)
  assert.ok(served.length < SHELL.length * 0.8)
  assert.equal(readFileSync(join(REPO_ROOT, 'apps/docs-next/public/ecosystem-bar.js'), 'utf8'), served)
  const cssSource = readFileSync(join(REPO_ROOT, 'apps/docs-next/shell/v1.css'), 'utf8')
  const servedCss = readFileSync(join(REPO_ROOT, 'apps/docs-next/public/shell/v1.css'), 'utf8')
  assert.equal(servedCss, transformSync(cssSource, { loader: 'css', minify: true, legalComments: 'none', banner: '/*! AgentsKit shell v1 — generated from https://github.com/AgentsKit-io/agentskit/blob/main/apps/docs-next/shell/v1.css */' }).code)
  for (const rel of ['apps/registry/public/shell', 'apps/registry/public/ecosystem-bar.js']) {
    assert.equal(existsSync(join(REPO_ROOT, rel)), false, rel)
  }
  assert.match(readFileSync(join(REPO_ROOT, 'apps/registry/lib/shell.ts'), 'utf8'), /NEXT_PUBLIC_AGENTSKIT_SHELL_ORIGIN \?\? DEFAULT_SHELL_ORIGIN/)
})

test('the shell is served cross-origin with a one-hour cache', () => {
  const config = readFileSync(join(REPO_ROOT, 'apps/docs-next/next.config.mjs'), 'utf8')
  assert.match(config, /source: '\/shell\/:path\*'/)
  assert.match(config, /public, max-age=3600, stale-while-revalidate=86400/)
  assert.match(config, /'Access-Control-Allow-Origin', value: '\*'/)
})
