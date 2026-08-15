import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'

const ROOT = process.cwd()
const read = (file) => readFileSync(join(ROOT, file), 'utf8')

test('Pattern Lab fixture replays every scenario without credentials or network', () => {
  const fixture = read('apps/docs-next/fixtures/pattern-lab/agent.ts')
  assert.doesNotMatch(fixture, /process\.env|fetch\(|https?:\/\//)

  const run = spawnSync(
    'pnpm',
    ['--filter', '@agentskit/docs-next', 'exec', 'tsx', 'fixtures/pattern-lab/agent.ts'],
    { cwd: ROOT, encoding: 'utf8' },
  )

  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /Support escalation draft/)
  assert.match(run.stdout, /API contract review/)
  assert.match(run.stdout, /Claim review/)
})

test('Pattern Lab is registered as a lazy showcase module with a human boundary', () => {
  const registry = read('apps/docs-next/lib/showcase.ts')
  const loader = read('apps/docs-next/components/showcase/live.tsx')
  const component = read('apps/docs-next/components/examples/PatternLab.tsx')

  assert.match(registry, /slug: 'pattern-lab'/)
  assert.match(registry, /module: 'PatternLab'/)
  assert.match(loader, /PatternLab: \(\) => import\('\@\/components\/examples\/PatternLab'\)/)
  assert.match(component, /No network, credentials, or external actions/)
  assert.match(component, /Human review/)
})
