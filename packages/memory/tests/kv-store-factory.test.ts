import { describe, expect, it } from 'vitest'
import { AgentsKitError } from '@agentskit/core'
import {
  createKvMemoryFromConfig,
  isMemoryBackendSupported,
  MEMORY_BACKEND_SUPPORT,
} from '../src/index'

describe('createKvMemoryFromConfig', () => {
  it('builds the in-memory backend', async () => {
    const s = createKvMemoryFromConfig({ config: { backend: 'in-memory' } })
    await s.set('k', 1)
    expect(await s.get('k')).toBe(1)
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

describe('MEMORY_BACKEND_SUPPORT', () => {
  it('marks all six backends supported', () => {
    expect(Object.values(MEMORY_BACKEND_SUPPORT).every((s) => s === 'supported')).toBe(true)
    expect(isMemoryBackendSupported('vector')).toBe(true)
  })
})
