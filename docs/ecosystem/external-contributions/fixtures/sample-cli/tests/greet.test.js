import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'bin/sample-cli.js')

test('greet prints a hello line', () => {
  const run = spawnSync(process.execPath, [bin, 'greet', 'agents'], { encoding: 'utf8' })
  assert.equal(run.status, 0)
  assert.equal(run.stdout, 'hello, agents\n')
})
