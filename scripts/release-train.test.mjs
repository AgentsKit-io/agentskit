import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

const workflowUrl = new URL('../.github/workflows/release-train.yml', import.meta.url)
// The factory App cannot push workflow files; a maintainer adds it, and the test guards it from then on.
test('the workflow opens only a draft PR and never merges or publishes', { skip: !existsSync(workflowUrl) }, () => {
  const workflow = readFileSync(workflowUrl, 'utf8')
  assert.match(workflow, /draft: true/)
  assert.match(workflow, /pnpm check:packed-consumers/)
  assert.match(workflow, /audit-prod-high/)
  assert.doesNotMatch(workflow, /auto-?merge|gh pr merge|npm publish|pnpm publish|changeset publish/i)
})

// Criterion: proposals come from the canonical manifest, and the committed workspace agrees with it.
test('the committed workspace has no drift or peer violations against the manifest', () => {
  const root = new URL('../', import.meta.url)
  const committed = JSON.parse(readFileSync(new URL('release-train.json', root), 'utf8'))
  const workspace = [{ file: 'package.json', json: JSON.parse(readFileSync(new URL('package.json', root), 'utf8')) }]
  for (const parent of ['packages', 'apps']) {
    for (const entry of readdirSync(new URL(`${parent}/`, root), { withFileTypes: true })) {
      const file = new URL(`${parent}/${entry.name}/package.json`, root)
      if (entry.isDirectory() && existsSync(file)) workspace.push({ file: `${parent}/${entry.name}`, json: JSON.parse(readFileSync(file, 'utf8')) })
    }
  }
  assert.deepEqual(findDrift(committed, workspace), [])
  assert.deepEqual(findPeerViolations(committed, workspace), [])
})

test('validation flags duplicates, bad versions, missing groups and a missing id', () => {
  const dup = structuredClone(manifest)
  dup.groups[1].packages.react = { current: '1.0.0', minimum: '1.0.0' }
  assert.ok(validateManifest(dup).some((p) => /more than one group/.test(p)))
  const bad = structuredClone(manifest)
  bad.groups[1].packages.tsup.current = 'latest'
  assert.ok(validateManifest(bad).some((p) => /not a stable/.test(p)))
  assert.ok(validateManifest({ schemaVersion: 1, humanControlled: true, groups: [] }).some((p) => /no packages/.test(p)))
  assert.ok(validateManifest({ ...manifest, schemaVersion: 2 }).some((p) => /schemaVersion/.test(p)))
})

test('planner proposes several groups at once and nothing when up to date', () => {
  const updates = planUpdates(manifest, { react: '19.4.0', tsup: '8.6.0' })
  assert.deepEqual(updates.map((u) => u.group), ['react', 'tooling'])
  assert.deepEqual(planUpdates(manifest, { react: '19.3.1', tsup: '8.5.1' }), [])
  assert.deepEqual(planUpdates(manifest, {}), [])
})

test('applyToPackageJson leaves unrelated or already-diverging ranges alone', () => {
  const updates = planUpdates(manifest, { react: '19.4.0' })
  const json = { dependencies: { react: '^19.0.0', tsup: '8.5.1' }, name: 'x' }
  assert.deepEqual(applyToPackageJson(json, updates), json)
  assert.equal(applyToPackageJson({ optionalDependencies: { react: '~19.3.1' } }, updates).optionalDependencies.react, '~19.4.0')
})

test('drift ignores non-pinned ranges and matching versions; peers accept ranges at the minimum', () => {
  const ok = [{ file: 'a', json: { dependencies: { react: '19.3.1', tsup: '>=8' }, peerDependencies: { react: '^18.0.0 || ^19.0.0' } } }]
  assert.deepEqual(findDrift(manifest, ok), [])
  assert.deepEqual(findPeerViolations(manifest, ok), [])
})

test('proposal body lists every change with minimum consumer, compatibility gates and checklist', () => {
  const updates = planUpdates(manifest, { react: '19.4.0', 'react-dom': '19.4.0', tsup: '8.6.0' })
  const body = renderProposal(updates, manifest)
  assert.match(body, /### react/)
  assert.match(body, /\| `react` \| 19\.3\.1 \| 19\.4\.0 \| 18\.0\.0 \|/)
  assert.match(body, /\| `tsup` \| 8\.5\.1 \| 8\.6\.0 \| 8\.0\.0 \|/)
  assert.match(body, /check:packed-consumers/)
  assert.match(body, /check:release-train/)
  assert.match(body, /audit-prod-high/)
  assert.match(body, /Generated docs\/artifacts/)
  assert.doesNotMatch(body, /auto-?merge/i)
})

test('changeset lists every public package and moved dependency, and is empty without public packages', () => {
  const updates = planUpdates(manifest, { react: '19.4.0', tsup: '8.6.0' })
  const changeset = renderChangeset(updates, ['@agentskit/react', '@agentskit/ink'])
  assert.match(changeset, /^---\n"@agentskit\/react": patch\n"@agentskit\/ink": patch\n---\n/)
  assert.match(changeset, /react 19\.4\.0, tsup 8\.6\.0/)
  assert.equal(renderChangeset(updates, []), '')
})
