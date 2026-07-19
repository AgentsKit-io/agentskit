import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  classifyRegistryVersion,
  compareSemver,
  evaluateRegistryState,
  parseSemver,
} from './lib/release-registry.mjs'

describe('release registry semver', () => {
  test('parses stable and prerelease versions', () => {
    assert.deepEqual(parseSemver('1.2.3'), { major: 1, minor: 2, patch: 3, prerelease: [] })
    assert.deepEqual(parseSemver('1.2.3-beta.2+build.1').prerelease, ['beta', '2'])
    assert.throws(() => parseSemver('1.2'))
  })

  test('orders stable and prerelease versions', () => {
    assert.equal(compareSemver('1.2.4', '1.2.3'), 1)
    assert.equal(compareSemver('1.2.3-beta.2', '1.2.3-beta.10'), -1)
    assert.equal(compareSemver('1.2.3', '1.2.3-beta.10'), 1)
    assert.equal(compareSemver('1.2.3+one', '1.2.3+two'), 0)
  })
})

describe('release registry classification', () => {
  test('recognizes aligned, unpublished, new, and conflicting packages', () => {
    assert.equal(classifyRegistryVersion({
      name: '@agentskit/a', localVersion: '1.2.3', metadata: { latest: '1.2.3', versions: ['1.2.3'] },
    }).state, 'published')
    assert.equal(classifyRegistryVersion({
      name: '@agentskit/a', localVersion: '1.2.4', metadata: { latest: '1.2.3', versions: ['1.2.3'] },
    }).state, 'unpublished-ahead')
    assert.equal(classifyRegistryVersion({
      name: '@agentskit/a', localVersion: '0.1.0', metadata: { missing: true },
    }).state, 'new-package')
    assert.equal(classifyRegistryVersion({
      name: '@agentskit/a', localVersion: '1.2.2', metadata: { latest: '1.2.3', versions: ['1.2.2', '1.2.3'] },
    }).state, 'conflict')
  })

  test('blocks a new changeset train while prior versions remain unpublished', () => {
    const ahead = classifyRegistryVersion({
      name: '@agentskit/core', localVersion: '1.12.4', metadata: { latest: '1.12.3', versions: ['1.12.3'] },
    })
    assert.equal(evaluateRegistryState([ahead], { hasPendingChangesets: false }).ok, true)
    const blocked = evaluateRegistryState([ahead], { hasPendingChangesets: true })
    assert.equal(blocked.ok, false)
    assert.match(blocked.diagnostics[0], /cannot be stacked/)
    assert.equal(evaluateRegistryState([ahead], {
      hasPendingChangesets: true,
      allowRecovery: true,
    }).ok, true)
  })

  test('always rejects a registry version conflict', () => {
    const conflict = classifyRegistryVersion({
      name: '@agentskit/core', localVersion: '1.12.3', metadata: { latest: '1.12.4', versions: ['1.12.3', '1.12.4'] },
    })
    assert.equal(evaluateRegistryState([conflict], { hasPendingChangesets: false }).ok, false)
  })
})
