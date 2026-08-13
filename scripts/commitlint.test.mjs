import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = process.cwd()

test('commitlint contract is wired into the repository', () => {
  const config = readFileSync(join(root, 'commitlint.config.cjs'), 'utf8')
  const hook = readFileSync(join(root, '.husky/commit-msg'), 'utf8')
  const workflow = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')

  assert.match(config, /@commitlint\/config-conventional/)
  assert.match(config, /header-max-length/)
  assert.match(config, /'quality'/)
  assert.match(config, /'security'/)
  assert.match(config, /'merge'/)
  assert.equal(hook.trim(), 'pnpm exec commitlint --edit "$1"')
  assert.match(workflow, /name: Commitlint/)
  assert.match(workflow, /github\.event\.pull_request\.base\.sha/)
  assert.match(workflow, /github\.event\.pull_request\.head\.sha/)
})
