import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { fileVectorMemory } from '../src/file-vector'
import type { VectorStore, VectorStoreDocument, VectorStoreResult } from '../src/vector-store'
import type { VectorDocument } from '@agentskit/core'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { rm } from 'node:fs/promises'

const doc1: VectorDocument = {
  id: 'doc-1',
  content: 'The quick brown fox',
  embedding: [0.1, 0.2, 0.3],
  metadata: { source: 'test' },
}

const doc2: VectorDocument = {
  id: 'doc-2',
  content: 'Jumped over the lazy dog',
  embedding: [0.4, 0.5, 0.6],
}

describe('fileVectorMemory with custom VectorStore', () => {
  it('keeps canonical id/content when metadata collides with reserved fields', async () => {
    let stored: VectorStoreDocument[] = []
    const customStore: VectorStore = {
      async upsert(docs) { stored = docs },
      async query() { return stored.map(d => ({ id: d.id, score: 1, metadata: d.metadata })) },
      async delete(ids) { stored = stored.filter(d => !ids.includes(d.id)) },
    }
    const mem = fileVectorMemory({ path: '/tmp/unused', store: customStore })
    await mem.store([{ ...doc1, metadata: { _id: 'spoof', content: 'spoofed' } }])
    const result = await mem.search(doc1.embedding)
    expect(result[0]).toMatchObject({ id: doc1.id, content: doc1.content })
    await mem.delete!([doc1.id])
    expect(stored).toHaveLength(0)
  })
  it('delegates to custom store', async () => {
    const stored: VectorStoreDocument[] = []
    const customStore: VectorStore = {
      async upsert(docs) { stored.push(...docs) },
      async query() {
        return stored.map(d => ({ id: d.id, score: 0.9, metadata: d.metadata }))
      },
      async delete(ids) {
        const toRemove = new Set(ids)
        stored.splice(0, stored.length, ...stored.filter(d => !toRemove.has(d.id)))
      },
    }

    const mem = fileVectorMemory({ path: '/tmp/unused', store: customStore })

    await mem.store([doc1])
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe('doc-1')

    const results = await mem.search([0.1, 0.2, 0.3])
    expect(results).toHaveLength(1)
    expect(results[0].content).toBe('The quick brown fox')
    expect(results[0].score).toBe(0.9)

    await mem.delete!(['doc-1'])
    expect(stored).toHaveLength(0)
  })

  it('respects topK option', async () => {
    const customStore: VectorStore = {
      async upsert() {},
      async query(_v, topK) {
        const all: VectorStoreResult[] = [
          { id: 'a', score: 0.9, metadata: { content: 'A' } },
          { id: 'b', score: 0.8, metadata: { content: 'B' } },
          { id: 'c', score: 0.7, metadata: { content: 'C' } },
        ]
        return all.slice(0, topK)
      },
      async delete() {},
    }

    const mem = fileVectorMemory({ path: '/tmp/unused', store: customStore })
    const results = await mem.search([0.1], { topK: 2 })
    expect(results).toHaveLength(2)
  })

  it('filters by threshold', async () => {
    const customStore: VectorStore = {
      async upsert() {},
      async query() {
        return [
          { id: 'a', score: 0.9, metadata: { content: 'A' } },
          { id: 'b', score: 0.3, metadata: { content: 'B' } },
        ]
      },
      async delete() {},
    }

    const mem = fileVectorMemory({ path: '/tmp/unused', store: customStore })
    const results = await mem.search([0.1], { threshold: 0.5 })
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('a')
  })
})

describe('fileVectorMemory with vectra', () => {
  let dirPath: string

  beforeEach(() => {
    dirPath = join(tmpdir(), `agentskit-vectra-${Date.now()}`)
  })

  afterEach(async () => {
    try { await rm(dirPath, { recursive: true, force: true }) } catch {}
  })

  // Vectra cold-starts the on-disk index on first store(). The 5s
  // vitest default flakes on cold CI runners; 30s gives slow disks
  // enough headroom while still failing fast on real regressions.
  const VECTRA_TIMEOUT = 30_000

  it('stores and retrieves documents', async () => {
    const mem = fileVectorMemory({ path: dirPath })
    await mem.store([doc1, doc2])

    // Query with doc1's embedding should return doc1 with highest score
    const results = await mem.search(doc1.embedding, { topK: 2 })
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].id).toBe('doc-1')
    expect(results[0].content).toBe('The quick brown fox')
  }, VECTRA_TIMEOUT)

  it('delete removes documents', async () => {
    const mem = fileVectorMemory({ path: dirPath })
    await mem.store([doc1, doc2])
    await mem.delete!(['doc-1'])

    const results = await mem.search(doc1.embedding, { topK: 10 })
    const ids = results.map(r => r.id)
    expect(ids).not.toContain('doc-1')
  }, VECTRA_TIMEOUT)

  it('upserts one persistent item per public id', async () => {
    const first = fileVectorMemory({ path: dirPath })
    await first.store([{ ...doc1, content: 'old' }])
    await first.store([{ ...doc1, content: 'new' }])
    const reopened = fileVectorMemory({ path: dirPath })
    const results = await reopened.search(doc1.embedding, { topK: 10 })
    expect(results.filter(result => result.id === doc1.id)).toHaveLength(1)
    expect(results.find(result => result.id === doc1.id)?.content).toBe('new')
  }, VECTRA_TIMEOUT)

  it('keeps legacy random-ID duplicates while adding the stable-ID row', async () => {
    const { LocalIndex } = await import('vectra')
    const index = new LocalIndex(dirPath)
    await index.createIndex()
    await index.insertItem({ vector: doc1.embedding, metadata: { _id: doc1.id, content: 'legacy one' } })
    await index.insertItem({ vector: doc1.embedding, metadata: { _id: doc1.id, content: 'legacy two' } })

    const memory = fileVectorMemory({ path: dirPath })
    await memory.store([{ ...doc1, content: 'canonical' }])
    const reopened = fileVectorMemory({ path: dirPath })
    const duplicates = (await reopened.search(doc1.embedding, { topK: 10 })).filter(result => result.id === doc1.id)
    expect(duplicates).toHaveLength(3)
    expect(duplicates.map(result => result.content)).toContain('canonical')
  }, VECTRA_TIMEOUT)
})
