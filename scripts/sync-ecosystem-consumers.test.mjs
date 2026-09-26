import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'vitest'
import { REPO_ROOT } from './compute-stats.mjs'
import { CONSUMERS, CANONICAL_FILES, plannedChanges, sha256, updatedDigestFile } from './sync-ecosystem-consumers.mjs'

const canonical = Object.fromEntries(CANONICAL_FILES.map((file) => [file, readFileSync(join(REPO_ROOT, file), 'utf8')]))
const docBridge = CONSUMERS.find((consumer) => consumer.repo === 'AgentsKit-io/doc-bridge')
const digestFile = (files) => `${JSON.stringify({ schemaVersion: 1, repository: 'AgentsKit-io/agentskit', ref: 'main', files }, null, 2)}\n`

test('the consumer list covers the six sibling repositories with their default branches', () => {
  assert.deepEqual(CONSUMERS.map((consumer) => `${consumer.repo}@${consumer.base}`), [
    'AgentsKit-io/agentskit-registry@main',
    'AgentsKit-io/agentskit-chat@main',
    'AgentsKit-io/agents-playbook@main',
    'AgentsKit-io/doc-bridge@master',
    'AgentsKit-io/harness@main',
    'AgentsKit-io/code-review@main',
  ])
})

test('an in-sync consumer needs no changes', () => {
  assert.deepEqual(plannedChanges(CONSUMERS[0], canonical, { ...canonical }), {})
  const current = { ...canonical, 'ecosystem-upstream.json': digestFile({ 'ecosystem.json': sha256(canonical['ecosystem.json']), 'ecosystem-claims.json': sha256(canonical['ecosystem-claims.json']) }) }
  assert.deepEqual(plannedChanges(docBridge, canonical, current), {})
})

test('stale copies are replaced verbatim and only the canonical files are written', () => {
  const changes = plannedChanges(CONSUMERS[0], canonical, { 'ecosystem.json': '{}\n', 'ecosystem-claims.json': canonical['ecosystem-claims.json'] })
  assert.deepEqual(Object.keys(changes), ['ecosystem.json'])
  assert.equal(changes['ecosystem.json'], canonical['ecosystem.json'])
})

test('the Doc Bridge upstream digest follows the canonical content and keeps its metadata', () => {
  const current = { 'ecosystem.json': '{}\n', 'ecosystem-claims.json': '{}\n', 'ecosystem-upstream.json': digestFile({ 'ecosystem.json': sha256('{}\n'), 'ecosystem-claims.json': sha256('{}\n') }) }
  const changes = plannedChanges(docBridge, canonical, current)
  assert.deepEqual(Object.keys(changes).sort(), ['ecosystem-claims.json', 'ecosystem-upstream.json', 'ecosystem.json'])
  const digest = JSON.parse(changes['ecosystem-upstream.json'])
  assert.equal(digest.repository, 'AgentsKit-io/agentskit')
  assert.equal(digest.ref, 'main')
  assert.equal(digest.files['ecosystem.json'], sha256(canonical['ecosystem.json']))
  assert.equal(digest.files['ecosystem-claims.json'], sha256(canonical['ecosystem-claims.json']))
  assert.ok(changes['ecosystem-upstream.json'].endsWith('\n'))
  assert.equal(updatedDigestFile(changes['ecosystem-upstream.json'], canonical), changes['ecosystem-upstream.json'])
})

test('a consumer that must keep a digest file fails loudly when it is missing', () => {
  assert.throws(() => plannedChanges(docBridge, canonical, { ...canonical }), /missing ecosystem-upstream\.json/)
})

test('the workflow runs on canonical changes and stays a no-op without its token', () => {
  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/ecosystem-sync.yml'), 'utf8')
  assert.match(workflow, /- ecosystem\.json\n\s*- ecosystem-claims\.json/)
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /ECOSYSTEM_SYNC_TOKEN: \$\{\{ secrets\.ECOSYSTEM_SYNC_TOKEN \}\}/)
  assert.match(workflow, /if: env\.ECOSYSTEM_SYNC_TOKEN == ''\n\s*run: \|\n\s*echo "::notice/)
  assert.match(workflow, /permissions:\n\s*contents: read/)
})
