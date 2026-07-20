import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('@agentskit/svelte package manifest', () => {
  it('keeps svelte export condition aligned with module/types fields', async () => {
    const manifest = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8')) as {
      module: string
      types: string
      svelte: string
      exports: { '.': { types: string; svelte: string; import: string } }
      agentskit: { stability: string }
    }

    expect(manifest.exports['.'].types).toBe(manifest.types)
    expect(manifest.exports['.'].import).toBe(manifest.module)
    expect(manifest.exports['.'].svelte).toBe(manifest.svelte)
    expect(manifest.svelte).toBe(manifest.module)
    expect(manifest.agentskit.stability).toBe('beta')

    await expect(access(join(process.cwd(), manifest.types))).resolves.toBeUndefined()
    await expect(access(join(process.cwd(), manifest.module))).resolves.toBeUndefined()
  })

  it('loads the published store entry without creating a chat session', async () => {
    // Import the pure JS store module (not the component barrel) so Node can
    // resolve without compiling .svelte files at import time.
    const mod = await import(pathToFileURL(join(process.cwd(), 'dist/useChat.js')).href) as {
      createChatStore: unknown
    }
    expect(typeof mod.createChatStore).toBe('function')
    await expect(access(join(process.cwd(), 'dist/components/InputBar.svelte'))).resolves.toBeUndefined()
    await expect(access(join(process.cwd(), 'dist/components/ToolCallView.svelte'))).resolves.toBeUndefined()
  })
})
