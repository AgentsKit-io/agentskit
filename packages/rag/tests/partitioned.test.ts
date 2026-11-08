import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { VectorDocument, VectorMemory } from '@agentskit/core'
import { fileVectorMemory } from '../../memory/src/file-vector'
import { createPartitionedRAG } from '../src/index'

const embed = async (): Promise<number[]> => [1, 0, 0]

function memory(honourFilter: boolean): VectorMemory {
  const docs = new Map<string, VectorDocument>()
  return {
    store: input => { input.forEach(doc => docs.set(doc.id, doc)) },
    delete: ids => { ids.forEach(id => docs.delete(id)) },
    search: vi.fn(async (_embedding, options) => [...docs.values()]
      .filter(doc => !honourFilter || JSON.stringify(options?.filter) === JSON.stringify({
        _akPartition: { $eq: doc.metadata?._akPartition },
      }))
      .slice(0, options?.topK)
      .map(doc => ({ ...doc, score: 1 }))),
  }
}

describe('createPartitionedRAG', () => {
  it.each([true, false])('isolates same-ID ingest, search, retrieve and deletion (filter=%s)', async honourFilter => {
    const store = memory(honourFilter)
    const onDiagnostics = vi.fn()
    const a = createPartitionedRAG({ store, embed, partition: 'a', onDiagnostics, split: text => text.split('|') })
    const b = createPartitionedRAG({ store, embed, partition: 'b', onDiagnostics })
    await a.ingest([{ id: 'same', content: 'A|old', metadata: { _akPartition: 'b', tag: 'kept' } }])
    await b.ingest([{ id: 'same', content: 'B' }])
    expect((await a.search('query')).map(doc => doc.content)).toEqual(['A', 'old'])
    expect((await b.retrieve({ query: 'query', messages: [] })).map(doc => doc.content)).toEqual(['B'])
    await a.ingest([{ id: 'same', content: 'new' }])
    expect((await a.retrieve({ query: 'query' })).map(doc => doc.content)).toEqual(['new'])
    expect((await b.search('query')).map(doc => doc.content)).toEqual(['B'])
    expect(store.search).toHaveBeenCalledWith([1, 0, 0], {
      topK: 20, threshold: 0, filter: { _akPartition: { $eq: 'a' } },
    })
    await a.ingest([{ id: 'same', content: '' }])
    expect(await a.search('query')).toEqual([])
    expect((await b.search('query'))[0]?.content).toBe('B')
  })

  it('bounds one search and reports reduced recall when foreign candidates crowd out matches', async () => {
    const store = memory(false)
    const onDiagnostics = vi.fn()
    const a = createPartitionedRAG({ store, embed, partition: 'a', topK: 1, overfetchFactor: 2, onDiagnostics })
    const b = createPartitionedRAG({ store, embed, partition: 'b', onDiagnostics })
    await b.ingest([{ content: 'foreign 1' }, { content: 'foreign 2' }])
    await a.ingest([{ content: 'hidden match' }])
    expect(await a.search('query', { threshold: 0.4 })).toEqual([])
    expect(store.search).toHaveBeenCalledTimes(1)
    expect(onDiagnostics).toHaveBeenCalledWith({ partition: 'a', requestedTopK: 1,
      candidateLimit: 2, examined: 2, rejected: 2, returned: 0, recall: 'potentially-reduced' })
  })

  it('fails closed on missing metadata and caps a store that ignores topK', async () => {
    const onDiagnostics = vi.fn()
    const rag = createPartitionedRAG({ embed, partition: 'a', topK: 1, overfetchFactor: 1, onDiagnostics,
      store: { store: async () => undefined, search: async () => [
        { id: 'missing', content: 'unknown' },
        { id: 'outside-bound', content: 'A', metadata: { _akPartition: 'a' } },
      ] } })
    expect(await rag.retrieve({ query: 'query' })).toEqual([])
    expect(onDiagnostics).toHaveBeenCalledWith(expect.objectContaining({ examined: 1, rejected: 1 }))
  })

  it('validates construction and unsafe per-search limits', async () => {
    const config = { embed, store: memory(false), partition: 'a', onDiagnostics: vi.fn() }
    expect(() => createPartitionedRAG({ ...config, partition: '' })).toThrow(TypeError)
    for (const overfetchFactor of [0, 17, 1.5, NaN, Infinity]) {
      expect(() => createPartitionedRAG({ ...config, overfetchFactor })).toThrow(TypeError)
    }
    expect(() => createPartitionedRAG({ ...config, onDiagnostics: undefined! })).toThrow(TypeError)
    await expect(createPartitionedRAG(config).search('query', { topK: Number.MAX_VALUE })).rejects.toThrow(TypeError)
  })

  it('preserves metadata and source, and propagates store and diagnostics failures', async () => {
    const store = memory(false)
    const onDiagnostics = vi.fn()
    const rag = createPartitionedRAG({ embed, store, partition: 'a', onDiagnostics })
    await rag.ingest([{ content: 'A', source: 'guide', metadata: { tag: 'kept' } }])
    expect((await rag.search('query'))[0]).toMatchObject({ source: 'guide',
      metadata: { tag: 'kept', _akPartition: 'a' }, score: 1 })
    onDiagnostics.mockImplementationOnce(() => { throw new Error('report failed') })
    await expect(rag.search('query')).rejects.toThrow('report failed')
    vi.mocked(store.search).mockRejectedValueOnce(new Error('store failed'))
    await expect(rag.search('query')).rejects.toThrow('store failed')
  })

  it('isolates a real fileVectorMemory index across partitions and reopen', async () => {
    const path = await mkdtemp(join(tmpdir(), 'ak-rag-partitions-'))
    try {
      const store = fileVectorMemory({ path })
      const onDiagnostics = vi.fn()
      const a = createPartitionedRAG({ store, embed, partition: 'a', onDiagnostics })
      const b = createPartitionedRAG({ store, embed, partition: 'b', onDiagnostics })
      await a.ingest([{ id: 'same', content: 'A', metadata: { _akPartition: 'b' } }])
      await b.ingest([{ id: 'same', content: 'B' }])
      expect((await a.retrieve({ query: 'query' })).map(doc => doc.content)).toEqual(['A'])
      expect((await b.search('query')).map(doc => doc.content)).toEqual(['B'])
      const reopened = createPartitionedRAG({ store: fileVectorMemory({ path }), embed, partition: 'b', onDiagnostics })
      expect((await reopened.search('query')).map(doc => doc.content)).toEqual(['B'])
      await a.ingest([{ id: 'same', content: '' }])
      expect(await a.search('query')).toEqual([])
      expect((await b.search('query')).map(doc => doc.content)).toEqual(['B'])
    } finally {
      await rm(path, { recursive: true, force: true })
    }
  })
})
