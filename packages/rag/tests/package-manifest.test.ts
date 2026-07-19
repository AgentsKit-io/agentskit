import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('@agentskit/rag package manifest + export purity', () => {
  it('publishes root and ./chunker dual CJS/ESM entries with aligned types', async () => {
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      type?: string
      main: string
      module: string
      types: string
      browser?: string
      'react-native'?: string
      sideEffects: boolean
      exports: {
        '.': {
          types: string
          import: string
          require: string
          browser?: string
          'react-native'?: string
        }
        './chunker': {
          types: string
          import: string
          require: string
        }
      }
      dependencies: Record<string, string>
    }

    expect(pkg.type).toBe('module')
    expect(pkg.sideEffects).toBe(false)
    expect(pkg.main).toBe('./dist/index.cjs')
    expect(pkg.module).toBe('./dist/index.js')
    expect(pkg.types).toBe('./dist/index.d.ts')
    expect(pkg.browser).toBe('./dist/index.browser.js')
    expect(pkg['react-native']).toBe('./dist/index.browser.js')

    expect(pkg.exports['.'].types).toBe(pkg.types)
    expect(pkg.exports['.'].import).toBe(pkg.module)
    expect(pkg.exports['.'].require).toBe(pkg.main)
    expect(pkg.exports['.'].browser).toBe('./dist/index.browser.js')
    expect(pkg.exports['.']['react-native']).toBe('./dist/index.browser.js')

    expect(pkg.exports['./chunker'].types).toBe('./dist/chunker.d.ts')
    expect(pkg.exports['./chunker'].import).toBe('./dist/chunker.js')
    expect(pkg.exports['./chunker'].require).toBe('./dist/chunker.cjs')

    expect(pkg.dependencies).toEqual({ '@agentskit/core': 'workspace:*' })

    for (const rel of [
      pkg.main,
      pkg.module,
      pkg.types,
      pkg.browser!,
      pkg.exports['./chunker'].import,
      pkg.exports['./chunker'].require,
      pkg.exports['./chunker'].types,
    ]) {
      await expect(access(join(root, rel)), `missing published file ${rel}`).resolves.toBeUndefined()
    }
  })

  it('exposes named public surface without a default export', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    for (const name of [
      'createRAG',
      'chunkText',
      'createRerankedRetriever',
      'createHybridRetriever',
      'bm25Score',
      'bm25Rerank',
      'loadUrl',
      'loadS3',
      'voyageReranker',
      'jinaReranker',
      'RagError',
      'RagErrorCodes',
    ] as const) {
      expect(mod[name], name).toBeDefined()
    }
  })

  it('keeps browser / react-native entry free of eager optional S3 peer resolution', async () => {
    const browser = await readFile(join(root, 'dist/index.browser.js'), 'utf8')
    // Universal bundle must not dynamic-import or statically import the optional AWS peer.
    // (Error strings may mention the package name for install hints — that is fine.)
    expect(browser).not.toMatch(/from\s+['"]@aws-sdk\/client-s3['"]/)
    expect(browser).not.toMatch(/import\s*\(\s*['"]@aws-sdk\/client-s3['"]/)
    expect(browser).not.toMatch(/\bimport\s*\(/u)

    const nodeEntry = await readFile(join(root, 'dist/index.js'), 'utf8')
    // Node entry resolves the peer only via lazy dynamic import (possibly through a helper).
    expect(nodeEntry).toMatch(/@aws-sdk\/client-s3/)
    expect(nodeEntry).toMatch(/import\s*\(|importOptionalPeer/)
  })

  it('exports chunker subpath from source and dist types', async () => {
    const chunker = await import('../src/chunker')
    expect(typeof chunker.chunkText).toBe('function')
    expect(chunker.default).toBeUndefined()

    const dts = await readFile(join(root, 'dist/chunker.d.ts'), 'utf8')
    expect(dts).toMatch(/export\s+(declare\s+)?function\s+chunkText|export\s*\{[^}]*chunkText/)
  })
})
