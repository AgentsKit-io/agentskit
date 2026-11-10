import { describe, expect, it } from 'vitest'
import { createVectorStore, type MemoryEmbedderLike, type MemoryVectorStoreLike } from '../src/index'

// Fake vector store: exact-key lookup via the __key metadata filter.
const fakeVector = (): MemoryVectorStoreLike => {
  const rows: { chunkId: string; metadata: Record<string, unknown> }[] = []
  return {
    upsert: async (input) => {
      for (const r of input) {
        const i = rows.findIndex((x) => x.chunkId === r.chunkId)
        const row = { chunkId: r.chunkId, metadata: r.metadata }
        if (i >= 0) rows[i] = row
        else rows.push(row)
      }
    },
    query: async (_vec, k, filter) => {
      const matches = rows.filter((r) =>
        Object.entries(filter ?? {}).every(([key, val]) => r.metadata[key] === val),
      )
      return matches.slice(0, k).map((r) => ({ chunkId: r.chunkId, score: 1, metadata: r.metadata }))
    },
  }
}

const fakeVectorWithRows = (rows: { chunkId: string; metadata: Record<string, unknown> }[]): MemoryVectorStoreLike => ({
  upsert: async input => {
    for (const row of input) {
      const i = rows.findIndex(existing => existing.chunkId === row.chunkId)
      const next = { chunkId: row.chunkId, metadata: row.metadata }
      if (i < 0) rows.push(next)
      else rows[i] = next
    }
  },
  query: async (_vec, k, filter) => rows.filter(row =>
    Object.entries(filter ?? {}).every(([field, value]) => row.metadata[field] === value),
  ).slice(0, k).map(row => ({ chunkId: row.chunkId, score: 1, metadata: row.metadata })),
})

const embedder: MemoryEmbedderLike = { embed: async (texts) => texts.map(() => [0.1, 0.2, 0.3]) }

describe('createVectorStore', () => {
  const config = { backend: 'vector' as const, provider: 'pgvector', collection: 'c' }

  it('round-trips by exact key', async () => {
    const s = createVectorStore({ config, vectorStore: fakeVector(), embedder })
    await s.set('topic', { summary: 'x' })
    expect(await s.get('topic')).toEqual({ summary: 'x' })
    expect(await s.get('absent')).toBeUndefined()
  })

  it('recall returns stored values for the collection', async () => {
    const s = createVectorStore({ config, vectorStore: fakeVector(), embedder })
    await s.set('a', 1)
    await s.set('b', 2)
    const out = await s.recall('anything', 5)
    expect(out).toEqual(expect.arrayContaining([1, 2]))
  })

  it('get skips expired nearest duplicates to find a live exact key', async () => {
    const rows = [
      { chunkId: 'c:topic', metadata: { __collection: 'c', __key: 'topic', __value: 'expired', __insertedAt: 1 } },
      { chunkId: 'legacy:topic', metadata: { __collection: 'c', __key: 'topic', __value: 'live', __insertedAt: Date.now() } },
    ]
    const store = createVectorStore({
      config: { ...config, ttlSeconds: 1 }, vectorStore: fakeVectorWithRows(rows), embedder,
    })
    expect(await store.get('topic')).toBe('live')
  })

  it('recall over-fetches a bounded amount to skip expired hits', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      chunkId: `c:${i}`,
      metadata: { __collection: 'c', __key: `${i}`, __value: i, __insertedAt: i < 3 ? 1 : Date.now() },
    }))
    const vector = fakeVectorWithRows(rows)
    let queried = 0
    const wrapped: MemoryVectorStoreLike = {
      ...vector,
      query: async (vec, k, filter) => { queried = k; return vector.query(vec, k, filter) },
    }
    const store = createVectorStore({
      config: { ...config, ttlSeconds: 1 }, vectorStore: wrapped, embedder,
    })
    expect(await store.recall('anything', 2)).toEqual([3, 4])
    expect(queried).toBe(102)
  })

  it('rejects cross-collection rows returned by a provider during TTL over-fetch', async () => {
    const rows = [
      { chunkId: 'other:topic', metadata: { __collection: 'other', __key: 'topic', __value: 'foreign', __insertedAt: Date.now() } },
      { chunkId: 'c:topic', metadata: { __collection: 'c', __key: 'topic', __value: 'local', __insertedAt: Date.now() } },
    ]
    const vector = fakeVectorWithRows(rows)
    const providerIgnoringFilter: MemoryVectorStoreLike = {
      ...vector,
      query: async (_vec, k) => rows.slice(0, k).map(row => ({ chunkId: row.chunkId, score: 1, metadata: row.metadata })),
    }
    const store = createVectorStore({
      config: { ...config, ttlSeconds: 60 }, vectorStore: providerIgnoringFilter, embedder,
    })

    expect(await store.get('topic')).toBe('local')
    expect(await store.recall('anything', 5)).toEqual(['local'])
  })

  it('never returns more than k live values after TTL over-fetch and treats k=0 as empty', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      chunkId: `c:${i}`,
      metadata: { __collection: 'c', __key: `${i}`, __value: i, __insertedAt: Date.now() },
    }))
    const store = createVectorStore({
      config: { ...config, ttlSeconds: 60 }, vectorStore: fakeVectorWithRows(rows), embedder,
    })
    expect(await store.recall('anything', 2)).toEqual([0, 1])
    expect(await store.recall('anything', 0)).toEqual([])
  })
})
