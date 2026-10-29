import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { applyToManifest, applyToPackageJson, compareVersions, findDrift, findPeerViolations, planUpdates, renderChangeset, renderProposal, validateManifest } from './lib/release-train.mjs'

const manifest = {
  schemaVersion: 1,
  humanControlled: true,
  groups: [
    { id: 'react', packages: { react: { current: '19.3.1', minimum: '18.0.0' }, 'react-dom': { current: '19.3.1', minimum: '18.0.0' } } },
    { id: 'tooling', packages: { tsup: { current: '8.5.1', minimum: '8.0.0' } } },
  ],
}

test('the committed manifest is valid', () => {
  assert.deepEqual(validateManifest(JSON.parse(readFileSync(new URL('../release-train.json', import.meta.url), 'utf8'))), [])
})

test('validation rejects automatic delivery and inverted minimums', () => {
  assert.ok(validateManifest({ ...manifest, humanControlled: false }).length > 0)
  const bad = structuredClone(manifest)
  bad.groups[1].packages.tsup.minimum = '9.0.0'
  assert.match(validateManifest(bad)[0], /above current/)
})

test('compareVersions orders numerically', () => {
  assert.ok(compareVersions('19.10.0', '19.9.9') > 0)
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0)
})

test('a newer member proposes the whole group; older or equal ones do not', () => {
  const updates = planUpdates(manifest, { react: '19.4.0', 'react-dom': '19.3.1', tsup: '8.5.0' })
  assert.deepEqual(updates, [{ group: 'react', changes: [{ name: 'react', from: '19.3.1', to: '19.4.0' }] }])
})

test('updates rewrite the manifest and workspace ranges, keeping prefixes', () => {
  const updates = planUpdates(manifest, { react: '19.4.0', 'react-dom': '19.4.0' })
  assert.equal(applyToManifest(manifest, updates).groups[0].packages['react-dom'].current, '19.4.0')
  const json = { dependencies: { react: '19.3.1' }, devDependencies: { 'react-dom': '^19.3.1' }, peerDependencies: { react: '>=18.0.0' } }
  assert.deepEqual(applyToPackageJson(json, updates), { dependencies: { react: '19.4.0' }, devDependencies: { 'react-dom': '^19.4.0' }, peerDependencies: { react: '>=18.0.0' } })
})

test('drift and peer-minimum violations are reported', () => {
  const workspace = [{ file: 'a/package.json', json: { devDependencies: { react: '^19.0.0' }, peerDependencies: { 'react-dom': '>=17.0.0' } } }]
  assert.equal(findDrift(manifest, workspace).length, 1)
  assert.equal(findPeerViolations(manifest, workspace)[0].name, 'react-dom')
})

test('proposal and changeset describe the change and keep delivery manual', () => {
  const updates = planUpdates(manifest, { react: '19.4.0' })
  assert.match(renderProposal(updates, manifest), /merge and publish manually/)
  assert.match(renderChangeset(updates, ['@agentskit/react']), /"@agentskit\/react": patch/)
  assert.equal(renderChangeset([], ['@agentskit/react']), '')
})

test('the workflow opens only a draft PR and never merges or publishes', () => {
  const workflow = readFileSync(new URL('../.github/workflows/release-train.yml', import.meta.url), 'utf8')
  assert.match(workflow, /draft: true/)
  assert.match(workflow, /pnpm check:packed-consumers/)
  assert.match(workflow, /audit-prod-high/)
  assert.doesNotMatch(workflow, /auto-?merge|gh pr merge|npm publish|pnpm publish|changeset publish/i)
})
