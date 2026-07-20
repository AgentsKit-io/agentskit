import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'
import { validateLighthouseManifest } from './lib/lighthouse-manifest.mjs'

const read = (path) => readFileSync(join(REPO_ROOT, path), 'utf8')

test('the reference journey is derived from the canonical manifest', () => {
  const source = read('apps/docs-next/lib/reference-journey.ts')
  assert.match(source, /import manifest from '\.\/ecosystem\.json'/)
  assert.match(source, /agentskit\.navigation\.next\.map/)
  assert.doesNotMatch(source, /https:\/\//)
})

test('the homepage exposes role, audience, maturity, proof, and contextual next steps', () => {
  const source = read('apps/docs-next/app/(home)/page.tsx')
  assert.match(source, /agentsKitIdentity\.role/)
  assert.match(source, /agentsKitIdentity\.audience/)
  assert.match(source, /agentsKitIdentity\.maturity/)
  assert.match(source, /agentsKitIdentity\.proof/)
  assert.match(source, /<ReferenceJourney \/>/)
})

test('the first-agent fixture runs without credentials or network access', () => {
  const fixture = read('apps/docs-next/fixtures/first-agent/agent.ts')
  assert.doesNotMatch(fixture, /process\.env|fetch\(|https?:\/\//)

  const run = spawnSync(
    'pnpm',
    ['--filter', '@agentskit/docs-next', 'exec', 'tsx', 'fixtures/first-agent/agent.ts'],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  )

  assert.equal(run.status, 0, run.stderr)
  assert.equal(run.stdout.trim(), 'Agent ready. I received: Plan my first production agent')
})

test('the primary guide starts locally and keeps the provider step as progressive enhancement', () => {
  const guide = read('apps/docs-next/content/docs/get-started/getting-started/build-your-first-agent.mdx')
  const local = guide.indexOf('Run your first agent locally')
  const provider = guide.indexOf('Connect a model provider')
  assert.ok(local >= 0)
  assert.ok(provider > local)
  assert.match(guide, /No account, API key, or network call is required/)
})

test('the shared ecosystem bar contains its own mobile overflow', () => {
  const bar = read('apps/docs-next/public/ecosystem-bar.js')
  assert.match(bar, /@media\(max-width:767px\)/)
  assert.match(bar, /max-width:100vw;overflow-x:auto/)
  assert.match(bar, /scrollbar-width:none/)
  assert.match(bar, /selectedTab\.offsetLeft/)
  assert.match(bar, /this\.tabsRoot\.scrollTo/)
  assert.doesNotMatch(bar, /role="tabpanel" aria-live="polite"/)
})

test('the shared ecosystem bar resolves public numbers from canonical sources', () => {
  const bar = read('apps/docs-next/public/ecosystem-bar.js')
  assert.match(bar, /var INITIAL_CLAIMS =/)
  assert.match(bar, /loadCanonicalClaims/)
  assert.match(bar, /ecosystem-claims\.js/)
  assert.match(bar, /__akApplyEcosystemClaims/)
  assert.match(bar, /document\.currentScript/)
  assert.doesNotMatch(bar, /fetch\(product\.claimSource\.url/)
})

test('Lighthouse keeps the Vercel bypass out of audited URLs', () => {
  const workflow = read('.github/workflows/lighthouse.yml')
  const config = read('apps/docs-next/lighthouserc.cjs')

  assert.doesNotMatch(workflow, /x-vercel-protection-bypass=\$\{BYPASS\}/)
  assert.match(workflow, /configPath: \.\/apps\/docs-next\/lighthouserc\.cjs/)
  assert.match(workflow, /if: always\(\) && steps\.target\.outputs\.url != ''/)
  assert.match(workflow, /pnpm --filter @agentskit\/docs-next\.\.\. build/)
  assert.match(workflow, /http:\/\/127\.0\.0\.1:3000/)
  assert.match(workflow, /Preview protection did not preserve the expected origin/)
  assert.match(workflow, /steps\.usable_preview\.outputs\.url == ''/)
  assert.match(workflow, /EXPECTED_ORIGIN: \$\{\{ steps\.target\.outputs\.url \}\}/)
  assert.match(workflow, /Lighthouse did not produce a report manifest/)
  assert.match(config, /'x-vercel-protection-bypass': bypass/)
  assert.match(config, /extraHeaders/)
})

test('Lighthouse rejects authentication redirects and empty manifests', () => {
  const reports = new Map([
    ['/tmp/site.json', JSON.stringify({ finalUrl: 'https://preview.example/docs' })],
    ['/tmp/login.json', JSON.stringify({ finalUrl: 'https://vercel.com/login?secret=redacted' })],
  ])
  const readReport = (path) => reports.get(path)

  assert.equal(validateLighthouseManifest(
    [{ jsonPath: '/tmp/site.json' }],
    'https://preview.example',
    readReport,
  ).valid, true)
  assert.deepEqual(validateLighthouseManifest(
    [{ jsonPath: '/tmp/login.json' }],
    'https://preview.example',
    readReport,
  ), {
    expectedOrigin: 'https://preview.example',
    actualOrigins: ['https://vercel.com'],
    valid: false,
  })
  assert.throws(() => validateLighthouseManifest([], 'https://preview.example', readReport), /manifest is empty/)
})

test('the showcase index keeps interactive bundles on their detail routes', () => {
  const grid = read('apps/docs-next/components/showcase/grid.tsx')

  assert.doesNotMatch(grid, /LiveExample/)
  assert.doesNotMatch(grid, /components\/examples/)
  assert.match(grid, /<ShowcasePreview meta=\{s\} \/>/)
  assert.match(grid, /<h2 className=/)
  assert.doesNotMatch(grid, /text-\[(?:10|11)px\]/)
})

test('the stack builder labels controls and uses a lightweight code output', () => {
  const builder = read('apps/docs-next/components/mdx/stack-builder.tsx')

  assert.doesNotMatch(builder, /DynamicCodeBlock/)
  assert.match(builder, /htmlFor="stack-package-manager"/)
  assert.match(builder, /htmlFor="stack-framework"/)
  assert.match(builder, /htmlFor="stack-provider"/)
  assert.match(builder, /htmlFor="stack-memory"/)
  assert.match(builder, /function CodeOutput/)
})
