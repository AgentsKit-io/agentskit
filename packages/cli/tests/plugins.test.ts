import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadPlugins, mergePluginsIntoBundle } from '../src/extensibility/plugins'
import type { Plugin } from '../src/extensibility/plugins'

describe('mergePluginsIntoBundle', () => {
  it('flattens plugin records into registries', () => {
    const plugins: Plugin[] = [
      {
        name: 'a',
        slashCommands: [{ name: 'cmd-a', description: '', run: () => {} }],
        providers: { custom: () => ({}) },
      },
      {
        name: 'b',
        slashCommands: [{ name: 'cmd-b', description: '', run: () => {} }],
      },
    ]
    const bundle = mergePluginsIntoBundle(plugins)
    expect(bundle.plugins).toHaveLength(2)
    expect(bundle.slashCommands.map(c => c.name)).toEqual(['cmd-a', 'cmd-b'])
    expect(bundle.providers.custom).toBeTypeOf('function')
  })

  it('last plugin wins for provider name collisions', () => {
    const firstProvider = () => 'first'
    const secondProvider = () => 'second'
    const bundle = mergePluginsIntoBundle([
      { name: 'a', providers: { x: firstProvider } },
      { name: 'b', providers: { x: secondProvider } },
    ])
    expect(bundle.providers.x).toBe(secondProvider)
  })
})

describe('loadPlugins', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agentskit-plugins-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('loads a plugin from an absolute file path', async () => {
    const file = join(dir, 'plugin.mjs')
    writeFileSync(
      file,
      `export default {
        name: 'hello',
        slashCommands: [{ name: 'hi', description: 'say hi', run: () => {} }],
      }\n`,
    )
    const bundle = await loadPlugins({ specs: [file], autoDiscoverUserDir: false })
    expect(bundle.plugins).toHaveLength(1)
    expect(bundle.plugins[0]!.name).toBe('hello')
    expect(bundle.slashCommands).toHaveLength(1)
  })

  it('supports factory-style plugins', async () => {
    const file = join(dir, 'factory.mjs')
    writeFileSync(
      file,
      `export default (ctx) => ({
        name: 'factory',
        slashCommands: [{ name: 'here', description: ctx.cwd, run: () => {} }],
      })\n`,
    )
    const bundle = await loadPlugins({ specs: [file], cwd: dir, autoDiscoverUserDir: false })
    expect(bundle.plugins).toHaveLength(1)
    expect(bundle.slashCommands[0]!.description).toBe(dir)
  })

  it('auto-discovers plugins from a directory', async () => {
    writeFileSync(
      join(dir, 'one.mjs'),
      `export default { name: 'one' }\n`,
    )
    writeFileSync(
      join(dir, 'two.mjs'),
      `export default { name: 'two' }\n`,
    )
    const bundle = await loadPlugins({
      pluginDirs: [dir],
      autoDiscoverUserDir: false,
    })
    const names = bundle.plugins.map(p => p.name).sort()
    expect(names).toEqual(['one', 'two'])
  })

  it('reports but does not throw on a broken plugin', async () => {
    const good = join(dir, 'good.mjs')
    const bad = join(dir, 'bad.mjs')
    writeFileSync(good, `export default { name: 'good' }\n`)
    writeFileSync(bad, `throw new Error('boom')\n`)

    const errors: string[] = []
    const bundle = await loadPlugins({
      specs: [bad, good],
      autoDiscoverUserDir: false,
      onError: (spec) => errors.push(spec),
    })
    expect(errors).toEqual([bad])
    expect(bundle.plugins.map(p => p.name)).toEqual(['good'])
  })
})
