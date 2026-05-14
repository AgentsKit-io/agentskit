/**
 * Extended plugin loader tests — covers:
 * - Default onError writes to stderr (line 38)
 * - discoverPluginsInDir returns [] for non-existent dir (line 84)
 * - log callback inside loadPluginFromSpec (line 105)
 * - throw when module export is invalid (line 119)
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPlugins } from '../src/extensibility/plugins'

describe('loadPlugins — plugin loader edge cases', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-plugins-ext-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('uses default onError (writes to stderr) when no onError provided', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    const badFile = join(dir, 'bad.mjs')
    writeFileSync(badFile, `throw new Error('oops')\n`)

    // No onError provided → default handler uses process.stderr.write
    const bundle = await loadPlugins({
      specs: [badFile],
      autoDiscoverUserDir: false,
      // intentionally no onError
    })

    expect(bundle.plugins).toHaveLength(0)
    const stderr = stderrSpy.mock.calls.map(c => c[0] as string).join('')
    expect(stderr).toContain('oops')
  })

  it('silently returns empty for non-existent plugin dir', async () => {
    // pluginDirs entry that doesn't exist → discoverPluginsInDir returns []
    const bundle = await loadPlugins({
      pluginDirs: [join(dir, 'nonexistent-subdir')],
      autoDiscoverUserDir: false,
    })
    expect(bundle.plugins).toHaveLength(0)
  })

  it('log callback is invoked when plugin calls ctx.log', async () => {
    const logMessages: string[] = []

    const file = join(dir, 'logging-plugin.mjs')
    writeFileSync(
      file,
      `export default (ctx) => {
        ctx.log('hello from plugin')
        return { name: 'logger' }
      }\n`,
    )

    await loadPlugins({
      specs: [file],
      autoDiscoverUserDir: false,
      log: (msg) => logMessages.push(msg),
    })

    expect(logMessages.some(m => m.includes('hello from plugin'))).toBe(true)
  })

  it('throws (caught by onError) when module exports neither function nor named Plugin', async () => {
    const errors: string[] = []

    const file = join(dir, 'invalid-export.mjs')
    writeFileSync(file, `export default 42\n`)

    const bundle = await loadPlugins({
      specs: [file],
      autoDiscoverUserDir: false,
      onError: (spec, err) => errors.push(`${spec}: ${(err as Error).message}`),
    })

    expect(bundle.plugins).toHaveLength(0)
    expect(errors.some(e => e.includes('Plugin'))).toBe(true)
  })

  it('calls init on Plugin object if it has one', async () => {
    const file = join(dir, 'init-plugin.mjs')
    writeFileSync(
      file,
      `export default {
        name: 'with-init',
        init: async (ctx) => { ctx.log('init called') },
      }\n`,
    )

    const logMessages: string[] = []
    const bundle = await loadPlugins({
      specs: [file],
      autoDiscoverUserDir: false,
      log: (msg) => logMessages.push(msg),
    })

    expect(bundle.plugins).toHaveLength(1)
    expect(bundle.plugins[0]!.name).toBe('with-init')
    expect(logMessages.some(m => m.includes('init called'))).toBe(true)
  })

  it('auto-discovers plugins from default user dir (non-existent → empty)', async () => {
    // autoDiscoverUserDir=true with non-existent ~/.agentskit/plugins
    // This exercises discoverPluginsInDir returning [] for missing dir
    const bundle = await loadPlugins({
      autoDiscoverUserDir: true,
      // specs/pluginDirs empty so only user dir is tried
    })
    // Should not throw regardless of what's in the user dir
    expect(bundle).toBeDefined()
  })
})
