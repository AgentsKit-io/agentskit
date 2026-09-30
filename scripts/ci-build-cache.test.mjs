import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

test('package builds reuse Turbo cache and shared scripts invalidate it', () => {
  const root = resolve(import.meta.dirname, '..')
  const cache = mkdtempSync(join(tmpdir(), 'agentskit-ci-cache-'))
  const probe = join(root, 'scripts', `ci-cache-probe-${process.pid}.mjs`)
  const args = ['exec', 'turbo', 'run', 'build', '--filter=@agentskit/core', `--cache-dir=${cache}`]
  const run = (extra = []) => {
    const result = spawnSync('pnpm', [...args, ...extra], { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 0, 'Turbo build command must succeed')
    return result.stdout
  }

  try {
    assert.match(run(), /cache miss/)
    assert.match(run(), /cache hit/)
    const before = JSON.parse(run(['--dry=json'])).tasks[0].hash
    writeFileSync(probe, '// temporary shared build input\n', { flag: 'wx' })
    const after = JSON.parse(run(['--dry=json'])).tasks[0].hash
    assert.notEqual(after, before, 'shared script changes must invalidate builds')
    assert.match(run(), /cache miss/)
  } finally {
    rmSync(probe, { force: true })
    rmSync(cache, { recursive: true, force: true })
  }
})
