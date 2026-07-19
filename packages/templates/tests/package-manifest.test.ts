import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('@agentskit/templates package manifest + export purity', () => {
  it('publishes dual CJS/ESM root with beta stability', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      type?: string
      main: string
      module: string
      types: string
      sideEffects: boolean
      license: string
      exports: Record<string, { types: string; import: string; require: string }>
      dependencies: Record<string, string>
      agentskit: { stability: string }
    }

    expect(pkg.type).toBe('module')
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.license).toBe('MIT')
    expect(pkg.main).toBe('./dist/index.cjs')
    expect(pkg.module).toBe('./dist/index.js')
    expect(pkg.types).toBe('./dist/index.d.ts')
    expect(pkg.agentskit.stability).toBe('beta')

    expect(pkg.exports['.'].types).toBe(pkg.types)
    expect(pkg.exports['.'].import).toBe(pkg.module)
    expect(pkg.exports['.'].require).toBe(pkg.main)

    expect(pkg.dependencies).toEqual({ '@agentskit/core': 'workspace:*' })
  })

  it('exposes named public surface without a default export', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    for (const name of [
      'createToolTemplate',
      'createSkillTemplate',
      'createAdapterTemplate',
      'scaffold',
      'SCAFFOLD_TYPES',
      'validateScaffoldConfig',
      'validateToolTemplate',
      'validateSkillTemplate',
      'validateAdapterTemplate',
    ] as const) {
      expect(mod[name], name).toBeDefined()
    }
    expect(mod.SCAFFOLD_TYPES).toHaveLength(8)
  })

  it('keeps public source free of default exports', async () => {
    const sources = [
      'src/index.ts',
      'src/factories.ts',
      'src/validate.ts',
      'src/scaffold.ts',
      'src/scaffold-config.ts',
      'src/scaffold-fs.ts',
    ]
    for (const rel of sources) {
      const body = await readFile(join(root, rel), 'utf8')
      expect(body, rel).not.toMatch(/export\s+default\b/)
    }
  })
})
