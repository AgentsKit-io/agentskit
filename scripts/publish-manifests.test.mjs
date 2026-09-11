/**
 * Unit tests for the publish-manifest workspace: rewrite.
 * Run: node --test scripts/publish-manifests.test.mjs
 */

import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  assertNoWorkspaceProtocol,
  resolveWorkspaceProtocols,
  resolveWorkspaceRange,
} from './lib/publish-manifests.mjs'

describe('resolveWorkspaceRange', () => {
  test('mirrors pnpm publish semantics', () => {
    assert.equal(resolveWorkspaceRange('workspace:*', '1.12.9'), '1.12.9')
    assert.equal(resolveWorkspaceRange('workspace:', '1.12.9'), '1.12.9')
    assert.equal(resolveWorkspaceRange('workspace:^', '1.12.9'), '^1.12.9')
    assert.equal(resolveWorkspaceRange('workspace:~', '1.12.9'), '~1.12.9')
    assert.equal(resolveWorkspaceRange('workspace:^1.0.0', '1.12.9'), '^1.0.0')
  })

  test('leaves non-workspace ranges untouched', () => {
    assert.equal(resolveWorkspaceRange('^8.20.0', '1.0.0'), '^8.20.0')
    assert.equal(resolveWorkspaceRange('>=18.0.0', '1.0.0'), '>=18.0.0')
  })

  test('rejects alias ranges', () => {
    assert.throws(() => resolveWorkspaceRange('workspace:foo@*', '1.0.0'), /alias/)
  })
})

describe('resolveWorkspaceProtocols', () => {
  const versions = new Map([
    ['@agentskit/core', '1.12.9'],
    ['@agentskit/eval', '0.6.5'],
  ])

  test('rewrites every dependency field and reports the rewrites', () => {
    const source = {
      name: '@agentskit/ink',
      version: '0.10.10',
      dependencies: { '@agentskit/core': 'workspace:*', ink: '^7.1.0' },
      devDependencies: { '@agentskit/eval': 'workspace:^' },
      peerDependencies: { react: '>=18.0.0' },
    }
    const { manifest, rewrites } = resolveWorkspaceProtocols(source, versions)

    assert.deepEqual(manifest.dependencies, { '@agentskit/core': '1.12.9', ink: '^7.1.0' })
    assert.deepEqual(manifest.devDependencies, { '@agentskit/eval': '^0.6.5' })
    assert.deepEqual(manifest.peerDependencies, { react: '>=18.0.0' })
    assert.deepEqual(rewrites, [
      { field: 'dependencies', name: '@agentskit/core', from: 'workspace:*', to: '1.12.9' },
      { field: 'devDependencies', name: '@agentskit/eval', from: 'workspace:^', to: '^0.6.5' },
    ])
    // source manifest is not mutated
    assert.equal(source.dependencies['@agentskit/core'], 'workspace:*')
  })

  test('accepts a plain object map', () => {
    const { manifest } = resolveWorkspaceProtocols(
      { name: 'x', dependencies: { '@agentskit/core': 'workspace:*' } },
      { '@agentskit/core': '2.0.0' },
    )
    assert.equal(manifest.dependencies['@agentskit/core'], '2.0.0')
  })

  test('throws when a workspace dependency is unknown', () => {
    assert.throws(
      () => resolveWorkspaceProtocols({ name: 'x', dependencies: { '@agentskit/ghost': 'workspace:*' } }, versions),
      /@agentskit\/ghost is not a workspace package/,
    )
  })

  test('is a no-op for manifests without workspace ranges', () => {
    const source = { name: 'x', dependencies: { ajv: '^8.20.0' } }
    const { manifest, rewrites } = resolveWorkspaceProtocols(source, versions)
    assert.deepEqual(manifest, source)
    assert.equal(rewrites.length, 0)
  })
})

describe('assertNoWorkspaceProtocol', () => {
  test('passes clean manifests', () => {
    assert.doesNotThrow(() => assertNoWorkspaceProtocol({ name: 'x', dependencies: { y: '1.0.0' } }))
  })

  test('fails with the offending path', () => {
    assert.throws(
      () => assertNoWorkspaceProtocol({ name: '@agentskit/ink', dependencies: { '@agentskit/core': 'workspace:*' } }),
      /@agentskit\/ink: published manifest still contains workspace: protocol \(dependencies\.@agentskit\/core=workspace:\*\)/,
    )
  })
})
