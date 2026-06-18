import { describe, expect, it } from 'vitest'
import {
  CONFIG_PATH,
  DEFAULT_REGISTRY,
  SCHEMA_URL,
  buildConfig,
  parseConfig,
  readConfig,
  resolveConfig,
  serializeConfig,
  writeConfig,
  type ConfigIo,
} from '../src/components/config'
import type { ProjectScan } from '../src/components/types'

function makeScan(over: Partial<ProjectScan> = {}): ProjectScan {
  return {
    uiBinding: 'react',
    metaFramework: 'next-app',
    packageManager: 'pnpm',
    typescript: true,
    srcDir: 'src',
    importAlias: '@',
    styling: { mode: 'tailwind-preset', cssEntry: 'src/app/globals.css' },
    monorepo: null,
    ...over,
  }
}

/** In-memory ConfigIo backed by a Map. */
function fakeIo(seed: Record<string, string> = {}): ConfigIo & { files: Map<string, string> } {
  const files = new Map(Object.entries(seed))
  return {
    files,
    read: (p) => files.get(p) ?? null,
    write: (p, c) => void files.set(p, c),
  }
}

describe('buildConfig', () => {
  it('derives an aliased, src-prefixed Next App Router config', () => {
    const c = buildConfig(makeScan())
    expect(c.$schema).toBe(SCHEMA_URL)
    expect(c.schemaVersion).toBe(1)
    expect(c.uiBinding).toBe('react')
    expect(c.metaFramework).toBe('next-app')
    expect(c.typescript).toBe(true)
    expect(c.aliases).toEqual({ components: '@/components', lib: '@/lib', server: 'src/app/api' })
    expect(c.paths).toEqual({ root: '.', components: 'src/components', lib: 'src/lib', server: 'src/app/api' })
    expect(c.styling).toEqual({ mode: 'tailwind-preset', css: 'src/app/globals.css', tailwindConfig: null })
    expect(c.registries.default).toBe(DEFAULT_REGISTRY)
  })

  it('uses relative aliases + root-level paths when there is no alias or src', () => {
    const c = buildConfig(makeScan({ importAlias: null, srcDir: null, metaFramework: 'next-pages' }))
    expect(c.aliases).toEqual({ components: './components', lib: './lib', server: 'pages/api' })
    expect(c.paths.components).toBe('components')
    expect(c.paths.server).toBe('pages/api')
  })

  it('maps server dirs per meta-framework', () => {
    expect(buildConfig(makeScan({ uiBinding: 'svelte', metaFramework: 'sveltekit', srcDir: null })).paths.server).toBe('src/routes/api')
    expect(buildConfig(makeScan({ uiBinding: 'vue', metaFramework: 'nuxt', srcDir: null })).paths.server).toBe('server/api')
  })

  it('anchors root to the monorepo root', () => {
    expect(buildConfig(makeScan({ monorepo: { tool: 'pnpm', root: '/repo' } })).paths.root).toBe('/repo')
  })

  it('falls back to react/none for an unknown scan', () => {
    const c = buildConfig(makeScan({ uiBinding: 'unknown', metaFramework: 'unknown' }))
    expect(c.uiBinding).toBe('react')
    expect(c.metaFramework).toBe('none')
  })
})

describe('serialize / parse', () => {
  it('round-trips through serialize → parse', () => {
    const c = buildConfig(makeScan())
    const parsed = parseConfig(serializeConfig(c))
    expect(parsed).toEqual(c)
  })

  it('rejects malformed or incomplete configs', () => {
    expect(parseConfig('{ not json')).toBeNull()
    expect(parseConfig('null')).toBeNull()
    expect(parseConfig(JSON.stringify({ uiBinding: 'react' }))).toBeNull() // no schemaVersion/registries
  })
})

describe('read / write / resolve', () => {
  it('writes then reads the config under the root', () => {
    const io = fakeIo()
    const c = buildConfig(makeScan())
    const written = writeConfig(io, c)
    expect(written).toBe(CONFIG_PATH)
    expect(readConfig(io)).toEqual(c)
  })

  it('resolveConfig prefers the committed file, else derives from the scan', () => {
    const c = buildConfig(makeScan())
    const onDisk = fakeIo({ [CONFIG_PATH]: serializeConfig(c) })
    expect(resolveConfig(onDisk, makeScan())).toEqual({ config: c, fromDisk: true })

    const empty = fakeIo()
    const resolved = resolveConfig(empty, makeScan({ metaFramework: 'next-pages' }))
    expect(resolved.fromDisk).toBe(false)
    expect(resolved.config.metaFramework).toBe('next-pages')
  })
})
