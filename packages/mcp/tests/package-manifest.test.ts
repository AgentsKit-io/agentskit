import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('@agentskit/mcp package contract', () => {
  it('publishes a Node 20+ dual ESM/CJS beta package with an ESM bin', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      agentskit: { stability: string }
      bin: Record<string, string>
      dependencies: Record<string, string>
      engines: { node: string }
      exports: Record<string, { import: string; require: string; types: string }>
      main: string
      module: string
      sideEffects: boolean
      type: string
      types: string
    }

    expect(pkg.type).toBe('module')
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.engines.node).toBe('>=20')
    expect(pkg.agentskit.stability).toBe('beta')
    expect(pkg.exports['.']).toEqual({ types: pkg.types, import: pkg.module, require: pkg.main })
    expect(pkg.bin).toEqual({ 'agentskit-mcp': './dist/bin.js' })
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@agentskit/adapters', '@agentskit/core', '@agentskit/runtime', '@agentskit/tools',
    ])
  })

  it('uses a shebang and named public exports only', async () => {
    const source = await readFile(join(root, 'src/bin.ts'), 'utf8')
    expect(source.startsWith('#!/usr/bin/env node\n')).toBe(true)
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    expect(mod.createAgentsKitMcpServer).toBeTypeOf('function')
    expect(mod.createAgentTool).toBeTypeOf('function')
    expect(mod.fetchAgentSkill).toBeTypeOf('function')
    expect(mod.processStdio).toBeTypeOf('function')
  })
})
