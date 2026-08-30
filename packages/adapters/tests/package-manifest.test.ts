import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * webllm is documented as depending on optional peer `@mlc-ai/web-llm`.
 * Package metadata must declare it so installers do not hard-require a
 * browser-only package for Node consumers.
 */
describe('package manifest optional peers', () => {
  it('declares @mlc-ai/web-llm as an optional peerDependency', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkgPath = join(here, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: boolean }>
      exports?: Record<string, { types?: string; import?: string; require?: string }>
    }

    expect(pkg.peerDependencies?.['@mlc-ai/web-llm']).toEqual(expect.any(String))
    expect(pkg.peerDependenciesMeta?.['@mlc-ai/web-llm']?.optional).toBe(true)
  })

  it('publishes the Node-only CLI adapter subpath', () => {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkgPath = join(here, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      exports?: Record<string, { types?: string; import?: string; require?: string }>
    }
    expect(pkg.exports?.['./cli']).toEqual({
      types: './dist/cli/index.d.ts',
      import: './dist/cli/index.js',
      require: './dist/cli/index.cjs',
    })
  })
})
