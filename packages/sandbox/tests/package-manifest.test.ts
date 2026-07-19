import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

const NODE_BUILTIN_MARKERS = [
  /from\s+['"]node:/,
  /require\(\s*['"]node:/,
  /from\s+['"]fs['"]/,
  /from\s+['"]path['"]/,
  /from\s+['"]child_process['"]/,
  /from\s+['"]os['"]/,
]

describe('@agentskit/sandbox package manifest + export purity', () => {
  it('publishes root, ./sandbox, ./types, and ./web dual CJS/ESM entries', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      type?: string
      main: string
      module: string
      types: string
      sideEffects: boolean
      exports: Record<string, { types: string; import: string; require: string; browser?: string }>
      dependencies: Record<string, string>
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: boolean }>
      devDependencies: Record<string, string>
      agentskit: { stability: string }
    }

    expect(pkg.type).toBe('module')
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.main).toBe('./dist/index.cjs')
    expect(pkg.module).toBe('./dist/index.js')
    expect(pkg.types).toBe('./dist/index.d.ts')
    expect(pkg.agentskit.stability).toBe('beta')

    expect(pkg.exports['.'].types).toBe(pkg.types)
    expect(pkg.exports['.'].import).toBe(pkg.module)
    expect(pkg.exports['.'].require).toBe(pkg.main)

    expect(pkg.exports['./sandbox'].import).toBe('./dist/sandbox.js')
    expect(pkg.exports['./types'].import).toBe('./dist/types.js')
    expect(pkg.exports['./web'].import).toBe('./dist/web/index.js')
    expect(pkg.exports['./web'].browser).toBe('./dist/web/index.js')

    expect(pkg.dependencies).toEqual({ '@agentskit/core': 'workspace:*' })
    expect(pkg.peerDependencies?.['@e2b/code-interpreter']).toBeDefined()
    expect(pkg.peerDependenciesMeta?.['@e2b/code-interpreter']?.optional).toBe(true)
    expect(pkg.devDependencies['@e2b/code-interpreter']).toBeDefined()

  })

  it('exposes named public surface without a default export', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    for (const name of [
      'createSandbox',
      'sandboxTool',
      'createE2BBackend',
      'createMandatorySandbox',
      'nodeSpawner',
      'noneSandbox',
      'processSandbox',
      'sandboxExecRuntime',
      'bwrapRuntime',
      'dockerRuntime',
      'SandboxRegistry',
    ] as const) {
      expect(mod[name], name).toBeDefined()
    }
  })

  it('keeps the browser web entry free of node builtins', async () => {
    const web = [
      await readFile(join(root, 'src/web/index.ts'), 'utf8'),
      await readFile(join(root, 'src/web/web-worker-backend.ts'), 'utf8'),
    ].join('\n')
    for (const re of NODE_BUILTIN_MARKERS) {
      expect(web, `web entry matched ${re}`).not.toMatch(re)
    }
    // E2B peer must not be pulled into the web entry.
    expect(web).not.toMatch(/@e2b\/code-interpreter/)
    expect(web).not.toMatch(/\bfrom\s+['"]e2b['"]/)
  })
})
