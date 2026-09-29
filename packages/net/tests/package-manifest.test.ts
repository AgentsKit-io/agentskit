import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('@agentskit/net packaging contract', () => {
  it('is isomorphic, side-effect free and beta', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'))
    expect(manifest.sideEffects).toBe(false)
    expect(manifest.agentskit.stability).toBe('beta')
    expect(Object.keys(manifest.exports)).toEqual(['.', './rules'])
    expect(manifest.exports['./rules']).toEqual({
      types: './dist/rules.d.ts',
      import: './dist/rules.js',
      require: './dist/rules.cjs',
    })
    expect(Object.keys(manifest.dependencies).sort()).toEqual(['@agentskit/core', 'eventsource-parser', 'ipaddr.js'])
  })

  it('has no node: imports in its source (runs in browsers and edge)', async () => {
    const { readdir } = await import('node:fs/promises')
    for (const file of await readdir(join(process.cwd(), 'src'))) {
      const text = await readFile(join(process.cwd(), 'src', file), 'utf8')
      expect(text, file).not.toMatch(/from ['"]node:/)
    }
  })

  it('exposes only named runtime exports', async () => {
    const mod = await import('../src/index')
    expect((mod as Record<string, unknown>).default).toBeUndefined()
    for (const name of ['fetchWithRetry', 'retry', 'parseRetryAfter', 'readBody', 'parseSSE', 'assertPublicUrl', 'isPublicAddress', 'timeoutSignal']) {
      expect(mod[name as keyof typeof mod], name).toBeTypeOf('function')
    }
  })
})
