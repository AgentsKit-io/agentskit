import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

/**
 * Metro / Hermes purity + package export safety.
 * Static scan only — no Metro runtime dependency is introduced.
 */
describe('@agentskit/react-native package manifest + Metro/Hermes purity', () => {
  it('publishes dual CJS/ESM entries with aligned types', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      type?: string
      main: string
      module: string
      types: string
      sideEffects: boolean
      exports: { '.': { types: string; import: string; require: string } }
      dependencies: Record<string, string>
      peerDependencies: Record<string, string>
    }

    expect(pkg.type).toBe('module')
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.main).toBe('./dist/index.cjs')
    expect(pkg.module).toBe('./dist/index.js')
    expect(pkg.types).toBe('./dist/index.d.ts')
    expect(pkg.exports['.'].types).toBe(pkg.types)
    expect(pkg.exports['.'].import).toBe(pkg.module)
    expect(pkg.exports['.'].require).toBe(pkg.main)
    expect(pkg.dependencies).toEqual({ '@agentskit/core': 'workspace:*' })
    expect(pkg.peerDependencies.react).toBeDefined()
    expect(pkg.peerDependencies['react-native']).toBeDefined()

    await expect(access(join(root, pkg.types))).resolves.toBeUndefined()
    await expect(access(join(root, pkg.module))).resolves.toBeUndefined()
    await expect(access(join(root, pkg.main))).resolves.toBeUndefined()
  })

  it('exposes named public surface without a default export', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    for (const name of [
      'useChat',
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

  it('keeps src Metro/Hermes pure (no Node built-ins, no DOM globals)', async () => {
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

    const forbidden = [
      /from\s+['"]node:/,
      /require\(\s*['"]node:/,
      /from\s+['"](?:fs|path|os|crypto|stream|buffer|child_process|http|https|net|tls|zlib)['"]/,
      /\bBuffer\b/,
      /\bTextDecoder\b/,
      /\bTextEncoder\b/,
      /\bdocument\b/,
      /\bwindow\b/,
      /\bHTMLElement\b/,
      /\blocalStorage\b/,
    ]

    for (const file of files) {
      const source = await readFile(file, 'utf8')
      for (const pattern of forbidden) {
        expect(pattern.test(source), `${file} must remain Metro/Hermes pure (${pattern})`).toBe(false)
      }
    }
  })

  it('components import only react and react-native host primitives', async () => {
    const source = await readFile(join(root, 'src/components.tsx'), 'utf8')
    expect(source).toMatch(/from 'react'/)
    expect(source).toMatch(/from 'react-native'/)
    expect(source).toMatch(/from '@agentskit\/core'/)
    // No web-only styling / DOM attribute convention in JSX (comments may mention data-ak-*).
    expect(source).not.toMatch(/\sdata-ak-[\w-]*=/)
    expect(source).not.toMatch(/StyleSheet\.create/)
  })
})
