import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigError } from '@agentskit/core'
import {
  scaffold,
  planScaffoldFiles,
  SCAFFOLD_TYPES,
  validateScaffoldConfig,
} from '../src/scaffold'
import type { ScaffoldType } from '../src/scaffold'
import {
  lstat,
  readFile,
  rm,
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  readdir,
} from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import ts from 'typescript'

const workspaceRoot = resolve(import.meta.dirname, '../../..')
const coreTypes = join(workspaceRoot, 'packages/core/dist/index.d.ts')
const runtimeTypes = join(workspaceRoot, 'packages/runtime/dist/index.d.ts')

describe('scaffold', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentskit-scaffold-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  })

  it('scaffolds a tool package', async () => {
    const files = await scaffold({ type: 'tool', name: 'my-search', dir })

    expect(files.length).toBeGreaterThanOrEqual(5)
    expect(files.every(f => f.startsWith(join(dir, 'my-search')))).toBe(true)
    expect(files.some(f => f.includes('.agentskit-scaffold-stage'))).toBe(false)

    const pkg = JSON.parse(await readFile(join(dir, 'my-search', 'package.json'), 'utf8')) as {
      name: string
      dependencies: Record<string, string>
      engines: { node: string }
      license: string
      sideEffects: boolean
    }
    expect(pkg.name).toBe('agentskit-my-search')
    expect(pkg.dependencies['@agentskit/core']).toBe('^1.0.0')
    expect(pkg.engines.node).toBe('>=20')
    expect(pkg.license).toBe('MIT')
    expect(pkg.sideEffects).toBe(false)

    const src = await readFile(join(dir, 'my-search', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('ToolDefinition')
    expect(src).toContain("name: 'my-search'")
    expect(src).not.toMatch(/export\s+default/)

    const test = await readFile(join(dir, 'my-search', 'tests', 'index.test.ts'), 'utf8')
    expect(test).toContain('ToolDefinition')

    const tsup = await readFile(join(dir, 'my-search', 'tsup.config.ts'), 'utf8')
    expect(tsup).toContain('clean: true')

    const tsconfig = JSON.parse(
      await readFile(join(dir, 'my-search', 'tsconfig.json'), 'utf8'),
    ) as { compilerOptions: { types?: string[] } }
    expect(tsconfig.compilerOptions.types).toBeUndefined()
  })

  it('scaffolds a skill package', async () => {
    await scaffold({ type: 'skill', name: 'analyst', dir })
    const src = await readFile(join(dir, 'analyst', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('SkillDefinition')
    expect(src).toContain("name: 'analyst'")
    expect(src).toContain('systemPrompt')
  })

  it('scaffolds an adapter package', async () => {
    await scaffold({ type: 'adapter', name: 'my-llm', dir })
    const src = await readFile(join(dir, 'my-llm', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('AdapterFactory')
    expect(src).toContain('createSource')
    expect(src).toContain('MyLlmConfig')
  })

  it('generates valid package.json dual ESM/CJS surface', async () => {
    await scaffold({ type: 'tool', name: 'test-tool', dir })
    const pkg = JSON.parse(await readFile(join(dir, 'test-tool', 'package.json'), 'utf8')) as {
      type: string
      main: string
      module: string
      types: string
      exports: { '.': { types: string; import: string; require: string } }
      publishConfig: { access: string }
      scripts: { build: string; test: string }
    }
    expect(pkg.type).toBe('module')
    expect(pkg.main).toBe('./dist/index.cjs')
    expect(pkg.module).toBe('./dist/index.js')
    expect(pkg.types).toBe('./dist/index.d.ts')
    expect(pkg.exports['.'].require).toBe('./dist/index.cjs')
    expect(pkg.exports['.'].import).toBe('./dist/index.js')
    expect(pkg.publishConfig.access).toBe('public')
    expect(pkg.scripts.build).toBe('tsup')
    expect(pkg.scripts.test).toBe('vitest run')
  })

  it('generates README with package name', async () => {
    await scaffold({ type: 'skill', name: 'writer', dir, description: 'A writing skill' })
    const readme = await readFile(join(dir, 'writer', 'README.md'), 'utf8')
    expect(readme).toContain('agentskit-writer')
    expect(readme).toContain('A writing skill')
  })

  it('uses custom description', async () => {
    await scaffold({
      type: 'tool',
      name: 'slack',
      dir,
      description: 'Send Slack messages from agents',
    })
    const pkg = JSON.parse(await readFile(join(dir, 'slack', 'package.json'), 'utf8')) as {
      description: string
    }
    expect(pkg.description).toBe('Send Slack messages from agents')
  })

  it('scaffolds a vector-memory package without @agentskit/memory dep', async () => {
    await scaffold({ type: 'memory-vector', name: 'pinedrop', dir })
    const src = await readFile(join(dir, 'pinedrop', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('VectorMemory')
    expect(src).toContain('PinedropConfig')
    expect(src).toContain('AK_MEMORY_REMOTE_HTTP')
    const pkg = JSON.parse(await readFile(join(dir, 'pinedrop', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['@agentskit/core']).toBe('^1.0.0')
    expect(pkg.dependencies['@agentskit/memory']).toBeUndefined()
  })

  it('scaffolds a chat-memory package with real MemoryRecord contract', async () => {
    await scaffold({ type: 'memory-chat', name: 'turso-lite', dir })
    const src = await readFile(join(dir, 'turso-lite', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('ChatMemory')
    expect(src).toContain('TursoLiteConfig')
    expect(src).toContain('serializeMessages')
    expect(src).toContain('MemoryRecord')
    expect(src).toContain('version: 1')
    expect(src).toContain('AK_MEMORY_LOAD_FAILED')
    expect(src).not.toContain('as MemoryRecord[]')
    expect(src).not.toContain("const raw = '[]'")

    const test = await readFile(join(dir, 'turso-lite', 'tests', 'index.test.ts'), 'utf8')
    expect(test).toContain('MemoryRecord')
    expect(test).toContain('load/save/clear')
  })

  it('scaffolds a flow package with named export registry', async () => {
    await scaffold({ type: 'flow', name: 'nightly-refresh', dir })
    const src = await readFile(join(dir, 'nightly-refresh', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('FlowRegistry')
    expect(src).toContain('nightlyRefreshRegistry')
    expect(src).toContain("'http.get'")
    expect(src).not.toMatch(/export\s+default/)

    const yaml = await readFile(join(dir, 'nightly-refresh', 'flow.yaml'), 'utf8')
    expect(yaml).toContain('name: nightly-refresh')
    expect(yaml).toContain('run: http.get')

    const readme = await readFile(join(dir, 'nightly-refresh', 'README.md'), 'utf8')
    expect(readme).toContain('nightlyRefreshRegistry')
    expect(readme).toContain('compileFlow')

    const test = await readFile(join(dir, 'nightly-refresh', 'tests', 'index.test.ts'), 'utf8')
    expect(test).toContain('compileFlow')
    expect(test).toContain('nightlyRefreshRegistry')
    expect(test).not.toMatch(/import\s+registry\s+from/)

    const pkg = JSON.parse(
      await readFile(join(dir, 'nightly-refresh', 'package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@agentskit/runtime']).toBe('^0.10.0')
    expect(pkg.dependencies['@agentskit/core']).toBe('^1.0.0')
  })

  it('scaffolds an embedder package without adapters dep', async () => {
    await scaffold({ type: 'embedder', name: 'voyage-mini', dir })
    const src = await readFile(join(dir, 'voyage-mini', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('EmbedFn')
    expect(src).toContain('voyageMiniEmbedder')
    const pkg = JSON.parse(await readFile(join(dir, 'voyage-mini', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['@agentskit/adapters']).toBeUndefined()
    expect(Object.keys(pkg.dependencies)).toEqual(['@agentskit/core'])
  })

  it('scaffolds a browser-adapter package with contract tests', async () => {
    await scaffold({ type: 'browser-adapter', name: 'mlc-mini', dir })
    const src = await readFile(join(dir, 'mlc-mini', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('AdapterFactory')
    expect(src).toContain('MlcMiniConfig')
    expect(src).toContain('capabilities: { tools: false }')

    const test = await readFile(join(dir, 'mlc-mini', 'tests', 'index.test.ts'), 'utf8')
    expect(test).toContain('AdapterFactory')
    expect(test).toContain('streams text chunks')

    const pkg = JSON.parse(await readFile(join(dir, 'mlc-mini', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>
    }
    expect(pkg.dependencies['@agentskit/adapters']).toBeUndefined()
  })

  it('never uses wildcard dependency ranges', async () => {
    for (const type of SCAFFOLD_TYPES) {
      const plan = planScaffoldFiles({ type, name: `pkg-${type}`, dir: '/tmp' })
      const pkgFile = plan.find(f => f.relativePath === 'package.json')
      expect(pkgFile).toBeDefined()
      const pkg = JSON.parse(pkgFile!.content) as { dependencies: Record<string, string> }
      for (const [dep, range] of Object.entries(pkg.dependencies)) {
        expect(range, `${type} ${dep}`).not.toBe('*')
        expect(range, `${type} ${dep}`).toMatch(/^\^/)
      }
    }
  })

  it('covers all eight scaffold types with a deterministic plan matrix', () => {
    expect(SCAFFOLD_TYPES).toHaveLength(8)
    for (const type of SCAFFOLD_TYPES) {
      const a = planScaffoldFiles({ type, name: 'matrix-demo', dir: '/tmp' })
      const b = planScaffoldFiles({ type, name: 'matrix-demo', dir: '/tmp' })
      expect(a.map(f => f.relativePath)).toEqual(b.map(f => f.relativePath))
      expect(a.map(f => f.content)).toEqual(b.map(f => f.content))
      expect(a.some(f => f.relativePath === 'src/index.ts')).toBe(true)
      expect(a.some(f => f.relativePath === 'tests/index.test.ts')).toBe(true)
      // Source flow has no default export (tsup config default is the exception).
      const src = a.find(f => f.relativePath === 'src/index.ts')!.content
      expect(src).not.toMatch(/export\s+default/)
    }
  })

  it('validates before creating a no-I/O file plan', () => {
    expect(() =>
      planScaffoldFiles({ type: 'invalid' as ScaffoldType, name: 'safe', dir }),
    ).toThrow(ConfigError)
  })

  it('returns final paths and cleans staging on success', async () => {
    const files = await scaffold({ type: 'tool', name: 'final-paths', dir })
    for (const f of files) {
      expect(f.startsWith(join(dir, 'final-paths'))).toBe(true)
      await expect(lstat(f)).resolves.toBeDefined()
    }
    const entries = await readdir(dir)
    expect(entries.filter(e => e.startsWith('.agentskit-scaffold-'))).toEqual([])
  })

  it('fails on collision by default and succeeds with overwrite:true', async () => {
    await scaffold({ type: 'tool', name: 'collide', dir, description: 'first' })
    await expect(scaffold({ type: 'tool', name: 'collide', dir })).rejects.toThrow(ConfigError)
    await expect(scaffold({ type: 'tool', name: 'collide', dir })).rejects.toThrow(/already exists/)

    await scaffold({
      type: 'skill',
      name: 'collide',
      dir,
      description: 'second',
      overwrite: true,
    })
    const pkg = JSON.parse(await readFile(join(dir, 'collide', 'package.json'), 'utf8')) as {
      description: string
    }
    expect(pkg.description).toBe('second')
    const src = await readFile(join(dir, 'collide', 'src', 'index.ts'), 'utf8')
    expect(src).toContain('SkillDefinition')
  })

  it('rejects symlink destinations', async () => {
    const real = join(dir, 'real-target')
    await mkdir(real)
    await writeFile(join(real, 'marker.txt'), 'x', 'utf8')
    await symlink(real, join(dir, 'link-pkg'))

    await expect(
      scaffold({ type: 'tool', name: 'link-pkg', dir, overwrite: true }),
    ).rejects.toThrow(/symlink/i)
  })

  it('rejects empty name, empty dir, invalid type, and traversal-like names', () => {
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: '', dir }),
    ).toThrow(ConfigError)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: 'ok', dir: '' }),
    ).toThrow(/dir/)
    expect(() =>
      validateScaffoldConfig({ type: 'not-a-type' as ScaffoldType, name: 'ok', dir }),
    ).toThrow(/Invalid scaffold type/)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: '../escape', dir }),
    ).toThrow(/safe unscoped/)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: 'HasCaps', dir }),
    ).toThrow(/safe unscoped/)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: '@scope/pkg', dir }),
    ).toThrow(/safe unscoped/)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: 'has space', dir }),
    ).toThrow(/safe unscoped/)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: 'dot.name', dir }),
    ).toThrow(/safe unscoped/)
    expect(() =>
      validateScaffoldConfig({ type: 'tool', name: 'ok\0bad', dir }),
    ).toThrow(/NUL/)
  })

  it('rejects overlong description', () => {
    expect(() =>
      validateScaffoldConfig({
        type: 'tool',
        name: 'ok',
        dir,
        description: 'x'.repeat(1001),
      }),
    ).toThrow(/1000/)
  })

  it('typechecks generated source for each scaffold type against workspace packages', async () => {
    // Typechecking 8 generated packages with the full program is intentionally thorough.
    const require = createRequire(import.meta.url)
    // Ensure typescript resolves from this package's node_modules (no network).
    expect(require.resolve('typescript')).toContain('node_modules')

    for (const type of SCAFFOLD_TYPES) {
      const pkgDir = join(dir, `typecheck-${type}`)
      await mkdir(join(pkgDir, 'src'), { recursive: true })
      const plan = planScaffoldFiles({ type, name: `check-${type}`, dir: '/tmp' })
      const src = plan.find(f => f.relativePath === 'src/index.ts')!.content
      const entry = join(pkgDir, 'src', 'index.ts')
      await writeFile(entry, src, 'utf8')
      // Point path mappings at workspace dist types (no network install).
      await writeFile(
        join(pkgDir, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              skipLibCheck: true,
              noEmit: true,
              esModuleInterop: true,
              paths: {
                '@agentskit/core': [coreTypes],
                '@agentskit/runtime': [runtimeTypes],
              },
            },
            include: ['src'],
          },
          null,
          2,
        ),
        'utf8',
      )

      const configPath = join(pkgDir, 'tsconfig.json')
      const read = ts.readConfigFile(configPath, ts.sys.readFile)
      expect(read.error).toBeUndefined()
      const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, pkgDir)
      const program = ts.createProgram({
        rootNames: parsed.fileNames,
        options: parsed.options,
      })
      const diags = ts
        .getPreEmitDiagnostics(program)
        .filter(d => d.category === ts.DiagnosticCategory.Error)
      const text = diags
        .map(d => `${ts.flattenDiagnosticMessageText(d.messageText, '\n')} (${d.file?.fileName}:${d.start})`)
        .join('\n')
      expect(diags, `type errors for ${type}:\n${text}`).toEqual([])
    }
  }, 180_000)

  it('parses generated TypeScript with the workspace typescript package', () => {
    for (const type of SCAFFOLD_TYPES) {
      const plan = planScaffoldFiles({ type, name: 'syntax-check', dir: '/tmp' })
      for (const file of plan.filter(f => f.relativePath.endsWith('.ts'))) {
        const sf = ts.createSourceFile(
          file.relativePath,
          file.content,
          ts.ScriptTarget.ES2020,
          true,
          ts.ScriptKind.TS,
        )
        const parseDiags = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? []
        expect(parseDiags, `${type} ${file.relativePath}`).toEqual([])
      }
    }
  })
})
