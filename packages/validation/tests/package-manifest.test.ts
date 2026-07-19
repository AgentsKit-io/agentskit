import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('@agentskit/tools/validation packaging contract', () => {
  it('keeps validation private and publishes it through the tools subpath', async () => {
    const implementation = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
      private: boolean
      sideEffects: boolean
      agentskit: { stability: string }
    }
    const tools = JSON.parse(
      await readFile(resolve(root, '../tools/package.json'), 'utf8'),
    ) as {
      exports: Record<string, { types: string; import: string; require: string }>
      devDependencies: Record<string, string>
    }

    expect(implementation.private).toBe(true)
    expect(implementation.sideEffects).toBe(false)
    expect(implementation.agentskit.stability).toBe('beta')
    expect(tools.exports['./validation']).toEqual({
      types: './dist/validation.d.ts',
      import: './dist/validation.js',
      require: './dist/validation.cjs',
    })
    expect(tools.devDependencies.ajv).toMatch(/^\^8\./)
  })

  it('exposes only named runtime exports', async () => {
    const mod = await import('../src/index')
    expect(mod.default).toBeUndefined()
    expect(mod.createAjvValidator).toBeTypeOf('function')
    expect(Object.keys(mod)).toEqual(['createAjvValidator'])
  })
})
