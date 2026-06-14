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
})
