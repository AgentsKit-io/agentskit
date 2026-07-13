import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'

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
})
