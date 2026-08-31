import { describe, expect, it, vi } from 'vitest'
import { milvusVectorStore, pgvector, qdrant, weaviateVectorStore } from '../src/vector'

describe('memory trust boundaries', () => {
  it('rejects identifiers that would be interpolated into queries or paths', () => {
    const runner = { query: vi.fn(async () => ({ rows: [] })) }
    expect(() => pgvector({ runner, table: 'vectors; DROP TABLE users' })).toThrow(/simple identifier/)
    expect(() => weaviateVectorStore({ url: 'https://weaviate', className: 'Doc)' })).toThrow(/simple identifier/)
    expect(() => milvusVectorStore({ url: 'https://milvus', collection: 'docs/../admin' })).toThrow(/simple identifier/)
    expect(() => qdrant({ url: 'https://qdrant', collection: 'docs/../admin' })).toThrow(/simple identifier/)
  })

  it('bounds remote response bodies', async () => {
    const fetch = vi.fn(async () => new Response('x'.repeat(100))) as unknown as typeof globalThis.fetch
    const store = qdrant({ url: 'https://qdrant', collection: 'docs', fetch, maxResponseBytes: 16 })
    await expect(store.search([1])).rejects.toMatchObject({ code: 'AK_MEMORY_REMOTE_HTTP' })
  })

  it('enforces a deadline even when an injected fetch ignores AbortSignal', async () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof globalThis.fetch
    const store = qdrant({ url: 'https://qdrant', collection: 'docs', fetch, timeoutMs: 5 })
    await expect(store.search([1])).rejects.toThrow(/timed out after 5ms/)
  })
})
