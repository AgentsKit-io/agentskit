import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { runCommand } from '../packages/cross-platform/dist/index.js'

test('package builds reuse Turbo cache and shared scripts invalidate it', async () => {
  const root = resolve(import.meta.dirname, '..')
  const cache = mkdtempSync(join(tmpdir(), 'agentskit-ci-cache-'))
  const probe = join(root, 'scripts', `ci-cache-probe-${process.pid}.mjs`)
  let ownsProbe = false
  const args = ['exec', 'turbo', 'run', 'build', '--filter=@agentskit/core', `--cache-dir=${cache}`]
  const run = async (extra = []) => {
    const result = await runCommand('pnpm', [...args, ...extra], { cwd: root })
    assert.equal(result.code, 0, 'Turbo build command must succeed')
    return result.stdout
  }

  try {
    assert.match(await run(), /cache miss/)
    assert.match(await run(), /cache hit/)
    const before = JSON.parse(await run(['--dry=json'])).tasks[0].hash
    writeFileSync(probe, '// temporary shared build input\n', { flag: 'wx' })
    ownsProbe = true
    const after = JSON.parse(await run(['--dry=json'])).tasks[0].hash
    assert.notEqual(after, before, 'shared script changes must invalidate builds')
    assert.match(await run(), /cache miss/)
  } finally {
    if (ownsProbe) rmSync(probe, { force: true })
    rmSync(cache, { recursive: true, force: true })
  }
})
