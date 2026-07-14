import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bin = join(root, 'bin/sample-cli.js')

test('version prints the package version', () => {
  const run = spawnSync(process.execPath, [bin, 'version'], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout.trim(), /^\d+\.\d+\.\d+$/)
})
