import { describe, it, expect, vi } from 'vitest'
import type { EmbedFn, RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { createRAG } from '../src/rag'

function createMockEmbedder(): EmbedFn {
  return async (text: string) => {
    const chars = text.toLowerCase().split('')
    return [
      chars.reduce((sum, c) => sum + c.charCodeAt(0), 0) / chars.length,
      chars.length,
      text.includes(' ') ? 1 : 0,
    ]
  }
}

function createMockVectorMemory(): VectorMemory & { stored: VectorDocument[] } {
  const stored: VectorDocument[] = []

  return {
    stored,
    store: async (docs: VectorDocument[]) => {
      stored.push(...docs)
    },
    search: async (
      _embedding: number[],
      options?: { topK?: number; threshold?: number },
    ): Promise<RetrievedDocument[]> => {
      const topK = options?.topK ?? 5
      return stored.slice(0, topK).map(doc => ({
        id: doc.id,
        content: doc.content,
        source: (doc.metadata?.source as string) ?? undefined,
        score: 0.9,
        metadata: doc.metadata,
      }))
    },
  }
}

describe('createRAG', () => {
  describe('ingest', () => {
    it('chunks documents and stores embeddings', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store, chunkSize: 20, chunkOverlap: 0 })

      await rag.ingest([
        { id: 'doc1', content: 'Hello world this is a test document with some content' },
      ])

      expect(store.stored.length).toBeGreaterThan(1)
      store.stored.forEach(doc => {
        expect(doc.id).toMatch(/^doc1_chunk_\d+$/)
        expect(doc.embedding).toBeDefined()
        expect(doc.embedding.length).toBe(3)
        expect(doc.content.length).toBeGreaterThan(0)
      })
    })

    it('auto-generates document ID when not provided', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store, chunkSize: 1000, chunkOverlap: 0 })

      await rag.ingest([{ content: 'short text' }])

      expect(store.stored).toHaveLength(1)
      expect(store.stored[0].id).toMatch(/_chunk_0$/)
    })

    it('preserves source in metadata', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store, chunkSize: 1000, chunkOverlap: 0 })

      await rag.ingest([{ content: 'text', source: 'docs/readme.md' }])

      expect(store.stored[0].metadata?.source).toBe('docs/readme.md')
    })

    it('preserves custom metadata', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store, chunkSize: 1000, chunkOverlap: 0 })

      await rag.ingest([{ content: 'text', metadata: { author: 'Alice', version: 2 } }])

      expect(store.stored[0].metadata?.author).toBe('Alice')
      expect(store.stored[0].metadata?.version).toBe(2)
    })

    it('stores documentId and chunkIndex in metadata', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store, chunkSize: 10, chunkOverlap: 0 })

      await rag.ingest([{ id: 'myDoc', content: 'some longer text that will be chunked' }])

      expect(store.stored.length).toBeGreaterThan(1)
      store.stored.forEach((doc, i) => {
        expect(doc.metadata?.documentId).toBe('myDoc')
        expect(doc.metadata?.chunkIndex).toBe(i)
      })
    })

    it('does not call store when no documents provided', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()
      const storeSpy = vi.spyOn(store, 'store')

      const rag = createRAG({ embed, store })

      await rag.ingest([])

      expect(storeSpy).not.toHaveBeenCalled()
    })

    it('uses custom split function', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({
        embed,
        store,
        split: (text) => text.split('\n\n'),
      })

      await rag.ingest([{ id: 'doc', content: 'paragraph one\n\nparagraph two' }])

      expect(store.stored).toHaveLength(2)
      expect(store.stored[0].content).toBe('paragraph one')
      expect(store.stored[1].content).toBe('paragraph two')
    })
  })

  describe('search', () => {
    it('embeds query and searches store', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()
      const searchSpy = vi.spyOn(store, 'search')

      const rag = createRAG({ embed, store })

      await rag.ingest([{ content: 'some stored content' }])
      const results = await rag.search('query text')

      expect(searchSpy).toHaveBeenCalledWith(
        expect.any(Array),
        { topK: 5, threshold: 0 },
      )
      expect(results.length).toBeGreaterThan(0)
    })

    it('respects per-call topK and threshold options', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()
      const searchSpy = vi.spyOn(store, 'search')

      const rag = createRAG({ embed, store })

      await rag.ingest([{ content: 'content' }])
      await rag.search('query', { topK: 10, threshold: 0.5 })

      expect(searchSpy).toHaveBeenCalledWith(
        expect.any(Array),
        { topK: 10, threshold: 0.5 },
      )
    })

    it('uses configured defaults for topK and threshold', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()
      const searchSpy = vi.spyOn(store, 'search')

      const rag = createRAG({ embed, store, topK: 3, threshold: 0.2 })

      await rag.ingest([{ content: 'content' }])
      await rag.search('query')

      expect(searchSpy).toHaveBeenCalledWith(
        expect.any(Array),
        { topK: 3, threshold: 0.2 },
      )
    })
  })

  describe('retrieve (Retriever contract)', () => {
    it('implements Retriever interface', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store })

      await rag.ingest([{ content: 'stored text' }])
      const results = await rag.retrieve({ query: 'search', messages: [] })

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('content')
    })

    it('can be passed directly as a Retriever', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store })

      const retriever: { retrieve: (req: { query: string; messages: unknown[] }) => Promise<unknown[]> } = rag
      await rag.ingest([{ content: 'data' }])
      const results = await retriever.retrieve({ query: 'test', messages: [] })

      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('full pipeline', () => {
    it('ingest → embed → store → retrieve with source preserved', async () => {
      const embed = createMockEmbedder()
      const store = createMockVectorMemory()

      const rag = createRAG({ embed, store, chunkSize: 1000, chunkOverlap: 0 })

      await rag.ingest([
        { id: 'readme', content: 'AgentsKit is a toolkit for AI agents.', source: 'README.md' },
        { id: 'guide', content: 'Getting started with RAG pipelines.', source: 'guide.md' },
      ])

      const results = await rag.search('AI agents')

      expect(results.length).toBe(2)
      expect(results[0].source).toBeDefined()
      expect(results[0].metadata).toBeDefined()
    })
  })
})
