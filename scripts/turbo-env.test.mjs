import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'

const turbo = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'turbo.json'), 'utf8'))

test('turbo passes CI_TEST_PROFILE to test tasks so the Vitest PR budget applies', () => {
  for (const task of ['test', 'test:coverage']) {
    assert.ok(turbo.tasks[task].env?.includes('CI_TEST_PROFILE'), `${task} must list CI_TEST_PROFILE in env`)
  }
})
