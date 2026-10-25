import test from 'node:test'
import assert from 'node:assert/strict'
import { createDeltas } from './guardrail-report.mjs'

test('reports numeric changes on matching metric paths', () => {
  const previous = {
    schemaVersion: 1,
    checks: {
      jsdoc: { status: 'passed', coveragePercent: 34.5 },
      bundleSizes: { targets: [{ name: '@agentskit/core', sizeBytes: 9000 }] },
    },
  }
  const current = {
    jsdoc: { status: 'passed', coveragePercent: 35 },
    bundleSizes: { targets: [{ name: '@agentskit/core', sizeBytes: 9100 }, { name: '@agentskit/net', sizeBytes: 7000 }] },
  }

  assert.deepEqual(createDeltas(current, previous), [
    { path: 'jsdoc.coveragePercent', previous: 34.5, current: 35, delta: 0.5 },
    { path: 'bundleSizes.targets.@agentskit/core.sizeBytes', previous: 9000, current: 9100, delta: 100 },
  ])
})

test('omits deltas when no compatible previous report exists', () => {
  assert.deepEqual(createDeltas({ jsdoc: { total: 1 } }, null), [])
  assert.deepEqual(createDeltas({ jsdoc: { total: 1 } }, { schemaVersion: 2, checks: {} }), [])
})
