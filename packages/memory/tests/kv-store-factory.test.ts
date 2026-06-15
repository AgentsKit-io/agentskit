import { describe, expect, it } from 'vitest'
import { AgentsKitError } from '@agentskit/core'
import {
  createKvMemoryFromConfig,
  createKvMemoryFromConfigAuto,
  isMemoryBackendSupported,
  MEMORY_BACKEND_SUPPORT,
  MemoryBackendNotImplementedError,
} from '../src/index'

describe('createKvMemoryFromConfig', () => {
  it('builds the in-memory backend', async () => {
    const s = createKvMemoryFromConfig({ config: { backend: 'in-memory' } })
    await s.set('k', 1)
    expect(await s.get('k')).toBe(1)
  })

  it('builds the file backend', async () => {
    const s = createKvMemoryFromConfig({ config: { backend: 'file', path: '/tmp/ak-factory-file.json' } })
    expect(s.id).toContain('file:')
  })

  it('builds the localstorage backend (file fallback)', async () => {
    const s = createKvMemoryFromConfig({
      config: { backend: 'localstorage', key: 'k' },
      localStorageFilePath: '/tmp/ak-factory-ls.json',
    })
    expect(s.id).toContain('localstorage')
  })

  it('throws when sqlite opener is missing', () => {
    expect(() => createKvMemoryFromConfig({ config: { backend: 'sqlite', path: '/tmp/x.db' } })).toThrow(AgentsKitError)
  })

  it('throws when redis client is missing', () => {
    expect(() =>
      createKvMemoryFromConfig({ config: { backend: 'redis', url: 'redis://x', prefix: 'ak:' } }),
    ).toThrow(AgentsKitError)
  })

  it('throws when vector store/embedder are missing', () => {
    expect(() =>
      createKvMemoryFromConfig({ config: { backend: 'vector', provider: 'pgvector', collection: 'c' } }),
    ).toThrow(AgentsKitError)
  })
})

describe('createKvMemoryFromConfigAuto', () => {
  it('builds in-memory without any driver', async () => {
    const s = await createKvMemoryFromConfigAuto({ backend: 'in-memory' })
    await s.set('k', 2)
    expect(await s.get('k')).toBe(2)
  })

  it('builds file without any driver', async () => {
    const s = await createKvMemoryFromConfigAuto({ backend: 'file', path: '/tmp/ak-auto-file.json' })
    expect(s.id).toContain('file:')
  })

  it('throws for the vector backend (needs injected store)', async () => {
    await expect(createKvMemoryFromConfigAuto({ backend: 'vector', provider: 'pgvector', collection: 'c' })).rejects.toThrow(
      AgentsKitError,
    )
  })
})

describe('MEMORY_BACKEND_SUPPORT', () => {
  it('marks all six backends supported', () => {
    expect(Object.values(MEMORY_BACKEND_SUPPORT).every((s) => s === 'supported')).toBe(true)
    expect(isMemoryBackendSupported('vector')).toBe(true)
  })

  it('MemoryBackendNotImplementedError carries the backend + code', () => {
    const err = new MemoryBackendNotImplementedError('redis')
    expect(err.code).toBe('MEMORY_BACKEND_NOT_IMPLEMENTED')
    expect(err.backend).toBe('redis')
  })
})
