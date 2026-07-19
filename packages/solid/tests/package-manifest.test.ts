import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('@agentskit/solid package manifest', () => {
  it('keeps dual CJS/ESM export map aligned with package fields', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
      main: string
      module: string
      types: string
      exports: { '.': { types: string; import: string; require: string } }
      agentskit: { stability: string }
    }

    expect(manifest.exports['.'].types).toBe(manifest.types)
    expect(manifest.exports['.'].import).toBe(manifest.module)
    expect(manifest.exports['.'].require).toBe(manifest.main)
    expect(manifest.agentskit.stability).toBe('beta')

    await expect(access(join(process.cwd(), manifest.types))).resolves.toBeUndefined()
    await expect(access(join(process.cwd(), manifest.module))).resolves.toBeUndefined()
    await expect(access(join(process.cwd(), manifest.main))).resolves.toBeUndefined()
  })

  it('loads the published ESM entry without creating a chat session', async () => {
    const mod = await import(pathToFileURL(join(process.cwd(), 'dist/index.js')).href) as {
      useChat: unknown
      InputBar: unknown
      ToolCallView: unknown
    }
    expect(typeof mod.useChat).toBe('function')
    expect(mod.InputBar).toBeDefined()
    expect(mod.ToolCallView).toBeDefined()
  })
})
