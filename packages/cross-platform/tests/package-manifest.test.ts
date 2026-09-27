import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('@agentskit/cross-platform packaging contract', () => {
  it('publishes the node entry, the pure subpath and the guardrail bin', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'))
    expect(manifest.sideEffects).toBe(false)
    expect(manifest.agentskit.stability).toBe('beta')
    expect(Object.keys(manifest.exports)).toEqual(['.', './pure'])
    expect(manifest.exports['./pure'].browser).toBe('./dist/pure.js')
    expect(manifest.bin['agentskit-cross-platform']).toBe('./dist/bin.js')
    expect(manifest.engines.node).toBe('>=20.19')
  })

  it('owns the portability dependencies of the ecosystem', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'))
    expect(Object.keys(manifest.dependencies).sort()).toEqual(
      ['@agentskit/core', 'cross-spawn', 'graceful-fs', 'pathe', 'tree-kill', 'which'].sort(),
    )
  })

  it('exposes only named runtime exports', async () => {
    const mod = await import('../src/index')
    expect((mod as Record<string, unknown>).default).toBeUndefined()
    expect(mod.spawnProcess).toBeTypeOf('function')
    expect(mod.runCommand).toBeTypeOf('function')
    expect(mod.toPosix).toBeTypeOf('function')
  })
})
