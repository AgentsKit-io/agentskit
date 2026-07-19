import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('@agentskit/react package manifest + import safety', () => {
  it('publishes dual CJS/ESM entries with aligned types', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      type?: string
      main: string
      module: string
      types: string
      exports: {
        '.': { types: string; import: string; require: string }
        './theme': string
      }
      dependencies: Record<string, string>
      peerDependencies: Record<string, string>
    }

    expect(pkg.type).toBe('module')
    expect(pkg.main).toBe('./dist/index.cjs')
    expect(pkg.module).toBe('./dist/index.js')
    expect(pkg.types).toBe('./dist/index.d.ts')
    expect(pkg.exports['.'].types).toBe(pkg.types)
    expect(pkg.exports['.'].import).toBe(pkg.module)
    expect(pkg.exports['.'].require).toBe(pkg.main)
    expect(pkg.exports['./theme']).toBe('./dist/theme/default.css')
    expect(pkg.dependencies).toEqual({ '@agentskit/core': 'workspace:*' })
    expect(pkg.peerDependencies.react).toBeDefined()
    expect(pkg.peerDependencies['react-dom']).toBeDefined()

    await expect(access(join(root, pkg.types))).resolves.toBeUndefined()
    await expect(access(join(root, pkg.module))).resolves.toBeUndefined()
    await expect(access(join(root, pkg.main))).resolves.toBeUndefined()
    await expect(access(join(root, pkg.exports['./theme']))).resolves.toBeUndefined()
  })

  it('exposes named public surface without a default export', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    for (const name of [
      'useChat',
      'useStream',
      'useReactive',
      'ChatContainer',
      'Message',
      'InputBar',
      'Markdown',
      'CodeBlock',
      'ToolCallView',
      'ThinkingIndicator',
      'ToolConfirmation',
    ] as const) {
      expect(typeof mod[name]).toBe('function')
    }
  })

  it('keeps src free of Node built-in imports (browser-safe surface)', async () => {
    const srcRoot = join(root, 'src')
    const files: string[] = []
    async function walk(dir: string): Promise<void> {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) await walk(full)
        else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) files.push(full)
      }
    }
    await walk(srcRoot)

    const nodeImport = /from\s+['"]node:|require\(\s*['"]node:|from\s+['"](?:fs|path|os|crypto|stream|buffer|child_process)['"]/
    for (const file of files) {
      const source = await readFile(file, 'utf8')
      expect(nodeImport.test(source), `${file} must not import Node built-ins`).toBe(false)
    }
  })
})
