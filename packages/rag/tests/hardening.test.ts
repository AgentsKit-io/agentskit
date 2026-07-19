import { describe, it, expect, vi } from 'vitest'
import type { EmbedFn, RetrievedDocument, VectorDocument, VectorMemory } from '@agentskit/core'
import { createRAG } from '../src/rag'
import { chunkText } from '../src/chunker'
import {
  bm25Score,
  createHybridRetriever,
  createRerankedRetriever,
} from '../src/rerank'
import {
  loadDropbox,
  loadGcs,
  loadGitHubFile,
  loadGitHubTree,
  loadOneDrive,
  loadS3,
  loadUrl,
} from '../src/loaders'
import { voyageReranker, jinaReranker } from '../src/rerankers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function createMockEmbedder(): EmbedFn {
  return async (text: string) => {
    const chars = text.toLowerCase().split('')
    return [
      chars.reduce((sum, c) => sum + c.charCodeAt(0), 0) / Math.max(chars.length, 1),
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

function doc(id: string, content: string, score?: number): RetrievedDocument {
  return score === undefined ? { id, content } : { id, content, score }
}

function staticBase(docs: RetrievedDocument[]) {
  return {
    async retrieve() {
      return docs
    },
  }
}

function makeFetch(sequence: Array<[number, unknown, 'json' | 'text' | 'binary'] | Error>) {
  let i = 0
  const fake = vi.fn(async (url: string | URL | Request) => {
    const step = sequence[Math.min(i++, sequence.length - 1)]!
    if (step instanceof Error) throw step
    const [status, payload, kind] = step
    if (kind === 'binary') return new Response(payload as Uint8Array, { status })
    if (kind === 'json') return new Response(JSON.stringify(payload), { status })
    return new Response(payload as string, { status })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, calls: fake }
}

class ListCmd { input: Record<string, unknown>; constructor(i: Record<string, unknown>) { this.input = i } }
class GetCmd { input: Record<string, unknown>; constructor(i: Record<string, unknown>) { this.input = i } }

// ---------------------------------------------------------------------------
// chunkText hardening
// ---------------------------------------------------------------------------

describe('chunkText hardening', () => {
  it('terminates and returns a single chunk for zero / negative / non-finite chunkSize', () => {
    const text = 'alpha beta gamma delta epsilon'
    for (const chunkSize of [0, -5, NaN, Infinity, -Infinity]) {
      const chunks = chunkText(text, { chunkSize, chunkOverlap: 0 })
      expect(chunks).toEqual([text])
    }
  })

  it('treats negative / non-finite overlap as zero and still terminates', () => {
    const text = 'one two three four five six seven eight nine ten'
    for (const chunkOverlap of [-1, NaN, -Infinity]) {
      const chunks = chunkText(text, { chunkSize: 12, chunkOverlap })
      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.every(c => c.length > 0)).toBe(true)
    }
  })

  it('clamps overlap >= chunkSize so the loop still advances', () => {
    const text = 'aaaa bbbb cccc dddd eeee ffff'
    const chunks = chunkText(text, { chunkSize: 8, chunkOverlap: 100 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join(' ').length).toBeGreaterThan(0)
  })

  it('preserves valid-input splitting behaviour', () => {
    const text = 'word '.repeat(40).trim()
    const chunks = chunkText(text, { chunkSize: 50, chunkOverlap: 5 })
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(55))
  })
})

// ---------------------------------------------------------------------------
// createRAG hardening
// ---------------------------------------------------------------------------

describe('createRAG hardening', () => {
  it('skips empty-content documents and does not call store', async () => {
    const store = createMockVectorMemory()
    const storeSpy = vi.spyOn(store, 'store')
    const rag = createRAG({ embed: createMockEmbedder(), store })
    await rag.ingest([{ content: '' }, { content: '' }])
    expect(storeSpy).not.toHaveBeenCalled()
  })

  it('sanitizes invalid topK / threshold / chunkSize at construction', async () => {
    const store = createMockVectorMemory()
    const searchSpy = vi.spyOn(store, 'search')
    const rag = createRAG({
      embed: createMockEmbedder(),
      store,
      topK: 0,
      threshold: NaN,
      chunkSize: -10,
      chunkOverlap: -3,
    })
    await rag.ingest([{ id: 'd', content: 'hello world' }])
    await rag.search('hello')
    expect(searchSpy).toHaveBeenCalledWith(expect.any(Array), { topK: 1, threshold: 0 })
    expect(store.stored.length).toBe(1)
  })

  it('sanitizes per-call invalid topK / threshold', async () => {
    const store = createMockVectorMemory()
    const searchSpy = vi.spyOn(store, 'search')
    const rag = createRAG({ embed: createMockEmbedder(), store, topK: 3, threshold: 0.1 })
    await rag.ingest([{ content: 'x' }])
    await rag.search('q', { topK: -2, threshold: Number.NaN })
    expect(searchSpy).toHaveBeenCalledWith(expect.any(Array), { topK: 1, threshold: 0.1 })
  })

  it('keeps stable chunk ids and does not mutate input documents', async () => {
    const store = createMockVectorMemory()
    const rag = createRAG({ embed: createMockEmbedder(), store, chunkSize: 1000, chunkOverlap: 0 })
    const meta = { author: 'Alice', tags: ['a'] }
    const input = { id: 'stable', content: 'payload', source: 's.md', metadata: meta }
    await rag.ingest([input])
    input.content = 'mutated'
    input.metadata!.author = 'Bob'
    expect(store.stored[0]!.id).toBe('stable_chunk_0')
    expect(store.stored[0]!.content).toBe('payload')
    expect(store.stored[0]!.metadata?.author).toBe('Alice')
    expect(store.stored[0]!.metadata?.documentId).toBe('stable')
  })

  it('does not store partial results when embed fails mid-ingest', async () => {
    let calls = 0
    const embed: EmbedFn = async () => {
      calls++
      if (calls > 1) throw new Error('embed down')
      return [1, 0, 0]
    }
    const store = createMockVectorMemory()
    const storeSpy = vi.spyOn(store, 'store')
    const rag = createRAG({
      embed,
      store,
      chunkSize: 5,
      chunkOverlap: 0,
    })
    await expect(
      rag.ingest([{ id: 'd', content: 'abcdefghij klmnop' }]),
    ).rejects.toThrow(/embed down/)
    expect(storeSpy).not.toHaveBeenCalled()
  })

  it('sorts fully-scored search results descending (R6)', async () => {
    const store: VectorMemory = {
      store: async () => {},
      search: async () => [
        { id: 'low', content: 'a', score: 0.1 },
        { id: 'high', content: 'b', score: 0.9 },
        { id: 'mid', content: 'c', score: 0.5 },
      ],
    }
    const rag = createRAG({ embed: createMockEmbedder(), store })
    const out = await rag.search('q')
    expect(out.map(d => d.id)).toEqual(['high', 'mid', 'low'])
  })

  it('preserves scoreless search results without fabricating scores', async () => {
    const store: VectorMemory = {
      store: async () => {},
      search: async () => [
        { id: 'a', content: 'first' },
        { id: 'b', content: 'second' },
      ],
    }
    const rag = createRAG({ embed: createMockEmbedder(), store })
    const out = await rag.search('q')
    expect(out.map(d => d.id)).toEqual(['a', 'b'])
    expect(out.every(d => d.score === undefined)).toBe(true)
  })

  it('throws TypeError on mixed or non-finite store scores (never -Infinity)', async () => {
    const mixed: VectorMemory = {
      store: async () => {},
      search: async () => [
        { id: 'a', content: 'a', score: 0.9 },
        { id: 'b', content: 'b' },
      ],
    }
    const ragMixed = createRAG({ embed: createMockEmbedder(), store: mixed })
    await expect(ragMixed.search('q')).rejects.toThrow(TypeError)

    const nonFinite: VectorMemory = {
      store: async () => {},
      search: async () => [
        { id: 'a', content: 'a', score: Number.NaN },
        { id: 'b', content: 'b', score: 0.5 },
      ],
    }
    const ragNf = createRAG({ embed: createMockEmbedder(), store: nonFinite })
    await expect(ragNf.search('q')).rejects.toThrow(TypeError)
  })

  it('returns empty array for empty retrieve after empty ingest (R3)', async () => {
    const rag = createRAG({ embed: createMockEmbedder(), store: createMockVectorMemory() })
    await rag.ingest([])
    expect(await rag.retrieve({ query: 'anything', messages: [] })).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Rerank / hybrid hardening
// ---------------------------------------------------------------------------

describe('rerank / hybrid hardening', () => {
  it('does not mutate the request or base documents', async () => {
    const baseDocs = [doc('a', 'cats', 0.9), doc('b', 'dogs', 0.8)]
    const frozen = baseDocs.map(d => ({ ...d, metadata: { k: 1 } }))
    const base = staticBase(frozen)
    const request = { query: 'cat', messages: [] as never[] }
    const reranker = createRerankedRetriever(base, { topK: 2 })
    await reranker.retrieve(request)
    expect(request.query).toBe('cat')
    expect(frozen[0]!.score).toBe(0.9)
    expect(frozen[0]!.metadata).toEqual({ k: 1 })
  })

  it('clamps non-finite / zero candidatePool and topK to at least 1', async () => {
    const base = staticBase([doc('a', 'x', 1), doc('b', 'y', 0.5)])
    const r = createRerankedRetriever(base, { candidatePool: 0, topK: Number.NaN })
    const out = await r.retrieve({ query: 'x', messages: [] })
    expect(out.length).toBe(1)
  })

  it('throws AK_RAG_RERANK_FAILED on malformed custom reranker output', async () => {
    const base = staticBase([doc('a', 'a'), doc('b', 'b'), doc('c', 'c')])

    const withNull = createRerankedRetriever(base, {
      rerank: async () => [
        { id: 'c', content: 'c', score: 0.2 },
        null as unknown as RetrievedDocument,
      ],
      topK: 3,
    })
    await expect(withNull.retrieve({ query: 'q', messages: [] })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
    })

    const mixedScores = createRerankedRetriever(base, {
      rerank: async () => [
        { id: 'a', content: 'a', score: 0.9 },
        { id: 'b', content: 'b' },
      ],
      topK: 3,
    })
    await expect(mixedScores.retrieve({ query: 'q', messages: [] })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
    })

    const notArray = createRerankedRetriever(base, {
      rerank: async () => ({ id: 'a' }) as unknown as RetrievedDocument[],
      topK: 1,
    })
    await expect(notArray.retrieve({ query: 'q', messages: [] })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
    })
  })

  it('preserves fully scoreless custom reranker ordering', async () => {
    const base = staticBase([doc('a', 'a'), doc('b', 'b'), doc('c', 'c')])
    const r = createRerankedRetriever(base, {
      rerank: async () => [
        { id: 'c', content: 'c' },
        { id: 'a', content: 'a' },
        { id: 'b', content: 'b' },
      ],
      topK: 3,
    })
    const out = await r.retrieve({ query: 'q', messages: [] })
    expect(out.map(d => d.id)).toEqual(['c', 'a', 'b'])
    expect(out.every(d => d.score === undefined)).toBe(true)
  })

  it('throws on non-finite scores, missing fields, and rethrows RagError from custom rerankers', async () => {
    const base = staticBase([doc('a', 'a')])

    await expect(
      createRerankedRetriever(base, {
        rerank: async () => [{ id: 'a', content: 'a', score: Number.NaN }],
      }).retrieve({ query: 'q', messages: [] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/non-finite/) })

    await expect(
      createRerankedRetriever(base, {
        rerank: async () => [{ id: 1, content: 'a' } as unknown as RetrievedDocument],
      }).retrieve({ query: 'q', messages: [] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/id and content/) })

    await expect(
      createRerankedRetriever(base, {
        rerank: async () => { throw new Error('boom') },
      }).retrieve({ query: 'q', messages: [] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/reranker threw/) })

    const { RagError, RagErrorCodes } = await import('../src/errors')
    await expect(
      createRerankedRetriever(base, {
        rerank: async () => {
          throw new RagError({ code: RagErrorCodes.AK_RAG_RERANK_FAILED, message: 'provider down' })
        },
      }).retrieve({ query: 'q', messages: [] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: 'provider down' })
  })

  it('sorts fully scored custom reranker output descending', async () => {
    const base = staticBase([doc('a', 'a'), doc('b', 'b')])
    const r = createRerankedRetriever(base, {
      rerank: async () => [
        { id: 'b', content: 'b', score: 0.2 },
        { id: 'a', content: 'a', score: 0.9 },
      ],
      topK: 2,
    })
    const out = await r.retrieve({ query: 'q', messages: [] })
    expect(out.map(d => d.id)).toEqual(['a', 'b'])
  })

  it('normalizes negative vector scores for hybrid ranking', async () => {
    const base = staticBase([
      doc('best-keyword', 'the cat sat', -0.9),
      doc('high-vec', 'unrelated filler', -0.1),
    ])
    const hybrid = createHybridRetriever(base, {
      vectorWeight: 1,
      bm25Weight: 0,
      topK: 1,
    })
    const out = await hybrid.retrieve({ query: 'cat', messages: [] })
    expect(out[0]!.id).toBe('high-vec')
  })

  it('min-max hybrid: positive-only scores shift only by documented weights', async () => {
    // vector raw: weak=1, strong=11 → min-max → 0 and 1
    // With vectorWeight=1, bm25Weight=0 the ranking must follow vector only.
    // With vectorWeight=0, bm25Weight=1 ranking follows BM25 keyword match.
    const base = staticBase([
      doc('weak-vec-keyword', 'the cat sat on the mat', 1),
      doc('strong-vec-noise', 'zzzz unrelated filler text', 11),
    ])

    const vecOnly = createHybridRetriever(base, {
      vectorWeight: 1,
      bm25Weight: 0,
      topK: 2,
    })
    const vecOut = await vecOnly.retrieve({ query: 'cat mat', messages: [] })
    expect(vecOut.map(d => d.id)).toEqual(['strong-vec-noise', 'weak-vec-keyword'])
    // After min-max, strong→1 * 1 + bm25*0 = 1; weak→0.
    expect(vecOut[0]!.score).toBeCloseTo(1, 8)
    expect(vecOut[1]!.score).toBeCloseTo(0, 8)

    const bm25Only = createHybridRetriever(base, {
      vectorWeight: 0,
      bm25Weight: 1,
      topK: 2,
    })
    const bmOut = await bm25Only.retrieve({ query: 'cat mat', messages: [] })
    expect(bmOut[0]!.id).toBe('weak-vec-keyword')
    expect(bmOut[0]!.score).toBeGreaterThan(bmOut[1]!.score!)

    // Equal weights: blended = 0.5 * normV + 0.5 * normB
    const blended = createHybridRetriever(base, {
      vectorWeight: 0.5,
      bm25Weight: 0.5,
      topK: 2,
    })
    const blendOut = await blended.retrieve({ query: 'cat mat', messages: [] })
    expect(blendOut).toHaveLength(2)
    expect(blendOut.every(d => Number.isFinite(d.score!))).toBe(true)
    // Scores must lie in [0, 1] for equal unit weights after min-max.
    for (const d of blendOut) {
      expect(d.score!).toBeGreaterThanOrEqual(0)
      expect(d.score!).toBeLessThanOrEqual(1)
    }
  })

  it('handles constant vector scores without dividing by zero', async () => {
    const base = staticBase([
      doc('a', 'cat', 0.5),
      doc('b', 'dog', 0.5),
    ])
    const hybrid = createHybridRetriever(base, {
      vectorWeight: 1,
      bm25Weight: 0,
      topK: 2,
    })
    const out = await hybrid.retrieve({ query: 'cat', messages: [] })
    expect(out).toHaveLength(2)
    expect(out.every(d => Number.isFinite(d.score!))).toBe(true)
  })

  it('falls back when weights are invalid / non-finite / both zero', async () => {
    const base = staticBase([
      doc('keyword', 'the cat sat', 0.01),
      doc('high-vec', 'off topic', 1),
    ])
    const hybrid = createHybridRetriever(base, {
      vectorWeight: Number.NaN,
      bm25Weight: -3,
      topK: 1,
    })
    const out = await hybrid.retrieve({ query: 'cat', messages: [] })
    expect(out).toHaveLength(1)
    expect(['keyword', 'high-vec']).toContain(out[0]!.id)

    const zero = createHybridRetriever(base, { vectorWeight: 0, bm25Weight: 0, topK: 1 })
    const outZero = await zero.retrieve({ query: 'cat', messages: [] })
    expect(outZero).toHaveLength(1)
  })

  it('dedupes duplicate ids in hybrid normalize (first wins)', async () => {
    const base = staticBase([
      doc('dup', 'first cat', 1),
      { id: 'dup', content: 'second cat', score: 0.1 },
    ])
    const hybrid = createHybridRetriever(base, {
      vectorWeight: 1,
      bm25Weight: 0,
      topK: 2,
    })
    const out = await hybrid.retrieve({ query: 'cat', messages: [] })
    expect(out.length).toBeLessThanOrEqual(2)
    expect(out.every(d => Number.isFinite(d.score!))).toBe(true)
  })

  it('bm25Score never mutates input documents', () => {
    const docs = [doc('a', 'hello world', 0.1)]
    const ranked = bm25Score('hello', docs)
    expect(docs[0]!.score).toBe(0.1)
    expect(ranked[0]!.score).not.toBe(0.1)
    expect(ranked[0]).not.toBe(docs[0])
  })

  it('bm25Score sanitizes invalid k1/b and always emits finite scores', () => {
    const docs = [
      doc('a', 'the cat sat on the mat'),
      doc('b', 'cat cat cat'),
      doc('c', 'unrelated filler text only'),
    ]
    const baseline = bm25Score('cat mat', docs)

    for (const options of [
      { k1: -1 },
      { k1: Number.NaN },
      { k1: Number.POSITIVE_INFINITY },
      { k1: Number.NEGATIVE_INFINITY },
      { b: -0.5 },
      { b: 1.5 },
      { b: Number.NaN },
      { b: Number.POSITIVE_INFINITY },
      { k1: -1, b: 2 },
    ] as const) {
      const ranked = bm25Score('cat mat', docs, options)
      expect(ranked).toHaveLength(docs.length)
      expect(ranked.every(d => typeof d.score === 'number' && Number.isFinite(d.score!))).toBe(true)
      // Invalid finite/non-finite params fall back to documented defaults (1.5 / 0.75).
      expect(ranked.map(d => d.id)).toEqual(baseline.map(d => d.id))
      for (let i = 0; i < ranked.length; i++) {
        expect(ranked[i]!.score).toBeCloseTo(baseline[i]!.score!, 10)
      }
    }

    // Valid domain still honored: k1 >= 0 and b in [0, 1].
    const custom = bm25Score('cat', docs, { k1: 0, b: 0 })
    expect(custom.every(d => Number.isFinite(d.score!))).toBe(true)
  })

  it('hybrid extreme weights stay finite and preserve ordinary rankings', async () => {
    const base = staticBase([
      doc('keyword', 'the cat sat on the mat', 0.1),
      doc('high-vec', 'zzzz unrelated filler', 0.9),
    ])

    const extreme = createHybridRetriever(base, {
      vectorWeight: Number.MAX_VALUE,
      bm25Weight: Number.MAX_VALUE,
      topK: 2,
    })
    const extremeOut = await extreme.retrieve({ query: 'cat', messages: [] })
    expect(extremeOut).toHaveLength(2)
    expect(extremeOut.every(d => Number.isFinite(d.score!))).toBe(true)
    // Equal huge weights → 0.5/0.5 relative pair (scores in [0, 1]).
    for (const d of extremeOut) {
      expect(d.score!).toBeGreaterThanOrEqual(0)
      expect(d.score!).toBeLessThanOrEqual(1)
    }

    const oneHuge = createHybridRetriever(base, {
      vectorWeight: Number.MAX_VALUE,
      bm25Weight: 1,
      topK: 1,
    })
    const oneHugeOut = await oneHuge.retrieve({ query: 'cat', messages: [] })
    expect(Number.isFinite(oneHugeOut[0]!.score!)).toBe(true)
    // Vector dominates when its weight is astronomically larger.
    expect(oneHugeOut[0]!.id).toBe('high-vec')

    // Ordinary positive weights: ranking matches non-normalized relative proportions.
    const ordinary = createHybridRetriever(base, {
      vectorWeight: 0.6,
      bm25Weight: 0.4,
      topK: 2,
    })
    const scaled = createHybridRetriever(base, {
      vectorWeight: 6,
      bm25Weight: 4,
      topK: 2,
    })
    const ordOut = await ordinary.retrieve({ query: 'cat', messages: [] })
    const scaledOut = await scaled.retrieve({ query: 'cat', messages: [] })
    expect(ordOut.map(d => d.id)).toEqual(scaledOut.map(d => d.id))
    for (let i = 0; i < ordOut.length; i++) {
      expect(ordOut[i]!.score).toBeCloseTo(scaledOut[i]!.score!, 10)
      expect(Number.isFinite(ordOut[i]!.score!)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Loader hardening
// ---------------------------------------------------------------------------

describe('loader hardening', () => {
  it('wraps network failures as AK_RAG_LOAD_FAILED', async () => {
    const { fetch } = makeFetch([new Error('ECONNRESET')])
    await expect(loadUrl('https://x', { fetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/network error/),
    })
  })

  it('encodes GitHub path segments with spaces', async () => {
    const { fetch, calls } = makeFetch([[200, 'body', 'text']])
    await loadGitHubFile('o', 'r', 'docs/my file.md', { fetch, ref: 'main' })
    expect(String(calls.mock.calls[0]![0])).toContain('docs/my%20file.md')
  })

  it('returns partial success when some GitHub tree files fail', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return new Response(JSON.stringify({
          tree: [
            { path: 'ok.md', type: 'blob' },
            { path: 'missing.md', type: 'blob' },
          ],
        }), { status: 200 })
      }
      if (u.includes('missing.md')) return new Response('nope', { status: 404 })
      return new Response('ok-body', { status: 200 })
    }) as unknown as typeof globalThis.fetch
    const docs = await loadGitHubTree('o', 'r', { fetch })
    expect(docs).toHaveLength(1)
    expect(docs[0]!.metadata?.path).toBe('ok.md')
  })

  it('throws when all eligible GitHub tree downloads fail', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return new Response(JSON.stringify({
          tree: [
            { path: 'a.md', type: 'blob' },
            { path: 'b.md', type: 'blob' },
          ],
        }), { status: 200 })
      }
      return new Response('nope', { status: 404 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadGitHubTree('o', 'r', { fetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/all eligible downloads failed/),
    })
  })

  it('returns [] when tree is empty or fully filtered', async () => {
    const emptyFetch = vi.fn(async () =>
      new Response(JSON.stringify({ tree: [] }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    expect(await loadGitHubTree('o', 'r', { fetch: emptyFetch })).toEqual([])

    const filteredFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        tree: [{ path: 'a.md', type: 'blob' }],
      }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    expect(await loadGitHubTree('o', 'r', {
      fetch: filteredFetch,
      filter: () => false,
    })).toEqual([])
  })

  it('treats zero / negative / non-finite maxFiles as empty result', async () => {
    const { fetch } = makeFetch([
      [200, { tree: [{ path: 'a.ts', type: 'blob' }] }, 'json'],
      [200, 'body', 'text'],
    ])
    for (const maxFiles of [0, -1, Number.NaN]) {
      const docs = await loadGitHubTree('o', 'r', { fetch, maxFiles })
      expect(docs).toEqual([])
    }
  })

  it('throws on S3 incomplete pagination (truncated without new token)', async () => {
    let lists = 0
    const client = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          lists++
          return { Contents: [{ Key: 'a.txt' }], IsTruncated: true }
        }
        return { Body: { transformToString: async () => 'body' } }
      }),
    }
    await expect(loadS3({
      client,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/incomplete pagination/),
    })
    expect(lists).toBe(1)
  })

  it('skips individual S3 object failures when at least one succeeds', async () => {
    const client = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          return { Contents: [{ Key: 'a' }, { Key: 'b' }], IsTruncated: false }
        }
        if (cmd.input.Key === 'a') throw new Error('get failed')
        return { Body: { transformToString: async () => 'ok' } }
      }),
    }
    const docs = await loadS3({
      client,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]!.metadata?.key).toBe('b')
  })

  it('throws when all eligible S3 downloads fail', async () => {
    const client = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          return { Contents: [{ Key: 'a' }, { Key: 'b' }], IsTruncated: false }
        }
        throw new Error('get failed')
      }),
    }
    await expect(loadS3({
      client,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/all eligible downloads failed/),
    })
  })

  it('throws on GCS incomplete pagination (repeated page token)', async () => {
    let lists = 0
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('alt=media')) return new Response('body', { status: 200 })
      lists++
      return new Response(JSON.stringify({
        items: [{ name: `f${lists}` }],
        nextPageToken: 'same',
      }), { status: 200 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadGcs({ bucket: 'bk', accessToken: 't', fetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/incomplete pagination/),
    })
    // First page sets token "same"; second page repeats it → throw.
    expect(lists).toBe(2)
  })

  it('throws on Dropbox incomplete pagination (has_more without new cursor)', async () => {
    let lists = 0
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/download')) return new Response('body', { status: 200 })
      lists++
      return new Response(JSON.stringify({
        entries: [{ '.tag': 'file', path_display: `/f${lists}.txt` }],
        has_more: true,
      }), { status: 200 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadDropbox({ accessToken: 't', fetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/incomplete pagination/),
    })
    expect(lists).toBe(1)
  })

  it('paginates OneDrive via @odata.nextLink and stops on repeated links', async () => {
    const pages = new Map<string, unknown>([
      ['https://graph.microsoft.com/v1.0/me/drive/root/children', {
        value: [
          {
            id: 'f1',
            name: 'a.txt',
            file: { mimeType: 'text/plain' },
            '@microsoft.graph.downloadUrl': 'https://cdn.example/a',
          },
        ],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=2',
      }],
      ['https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=2', {
        value: [
          {
            id: 'f2',
            name: 'b.txt',
            file: { mimeType: 'text/plain' },
            '@microsoft.graph.downloadUrl': 'https://cdn.example/b',
          },
        ],
      }],
    ])
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.startsWith('https://cdn.example/')) {
        return new Response(`body-${u.slice(-1)}`, { status: 200 })
      }
      const page = pages.get(u)
      if (!page) return new Response('missing', { status: 404 })
      return new Response(JSON.stringify(page), { status: 200 })
    }) as unknown as typeof globalThis.fetch

    const docs = await loadOneDrive({ accessToken: 't', fetch })
    expect(docs.map(d => d.metadata?.name)).toEqual(['a.txt', 'b.txt'])

    // Repeated nextLink must throw, not loop.
    const loopFetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.startsWith('https://cdn.example/')) return new Response('x', { status: 200 })
      return new Response(JSON.stringify({
        value: [{
          id: 'f1',
          name: 'a.txt',
          file: { mimeType: 'text/plain' },
          '@microsoft.graph.downloadUrl': 'https://cdn.example/a',
        }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/drive/root/children',
      }), { status: 200 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadOneDrive({ accessToken: 't', fetch: loopFetch })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/repeated @odata\.nextLink/),
    })
  })

  it('OneDrive respects maxFiles, recursion guard, and all-failed semantics', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/root/children') && !u.includes('items/')) {
        return new Response(JSON.stringify({
          value: [
            { id: 'dir1', name: 'sub', folder: {} },
            {
              id: 'f1',
              name: 'root.txt',
              file: { mimeType: 'text/plain' },
              '@microsoft.graph.downloadUrl': 'https://cdn.example/root',
            },
          ],
        }), { status: 200 })
      }
      if (u.includes('/items/dir1/children')) {
        return new Response(JSON.stringify({
          value: [
            {
              id: 'f2',
              name: 'nested.txt',
              file: { mimeType: 'text/plain' },
              '@microsoft.graph.downloadUrl': 'https://cdn.example/nested',
            },
          ],
        }), { status: 200 })
      }
      if (u.startsWith('https://cdn.example/')) return new Response('body', { status: 200 })
      return new Response('nope', { status: 404 })
    }) as unknown as typeof globalThis.fetch

    const capped = await loadOneDrive({ accessToken: 't', fetch, maxFiles: 1 })
    expect(capped).toHaveLength(1)

    const allFail = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/children')) {
        return new Response(JSON.stringify({
          value: [
            {
              id: 'f1',
              name: 'a.txt',
              file: { mimeType: 'text/plain' },
              '@microsoft.graph.downloadUrl': 'https://cdn.example/a',
            },
          ],
        }), { status: 200 })
      }
      return new Response('nope', { status: 500 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadOneDrive({ accessToken: 't', fetch: allFail })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/all eligible downloads failed/),
    })
  })

  it('resolves async accessToken functions for GCS and OneDrive', async () => {
    const gcsToken = vi.fn(async () => 'gcs-tok')
    const gcsFetch = vi.fn(async () =>
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    await loadGcs({ bucket: 'b', accessToken: gcsToken, fetch: gcsFetch })
    expect(gcsToken).toHaveBeenCalled()

    const odToken = vi.fn(async () => 'od-tok')
    const odFetch = vi.fn(async () =>
      new Response(JSON.stringify({ value: [] }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    await loadOneDrive({ accessToken: odToken, fetch: odFetch })
    expect(odToken).toHaveBeenCalled()
  })

  it('forwards AbortSignal and surfaces abort as load failure', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      return new Response('ok', { status: 200 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadUrl('https://x', { fetch, signal: controller.signal })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/aborted/),
    })
    expect(fetch).toHaveBeenCalledWith(
      'https://x',
      expect.objectContaining({ signal: controller.signal }),
    )
  })

  it('does not swallow abort as an individual download skip', async () => {
    const controller = new AbortController()
    let downloads = 0
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return new Response(JSON.stringify({
          tree: [
            { path: 'a.md', type: 'blob' },
            { path: 'b.md', type: 'blob' },
          ],
        }), { status: 200 })
      }
      downloads++
      if (downloads === 1) {
        controller.abort()
        throw new DOMException('Aborted', 'AbortError')
      }
      return new Response('ok', { status: 200 })
    }) as unknown as typeof globalThis.fetch

    await expect(loadGitHubTree('o', 'r', {
      fetch,
      signal: controller.signal,
    })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/aborted/),
    })
  })

  it('throws AK_RAG_RERANK_FAILED on malformed voyage / jina results (no silent filter)', async () => {
    const voyageFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        data: [
          { index: 99, relevance_score: 1 },
          { index: 0, relevance_score: 0.8 },
        ],
      }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    const voyage = voyageReranker({ apiKey: 'k', fetch: voyageFetch })
    const docs = [
      { id: 'a', content: 'A' },
      { id: 'b', content: 'B' },
    ]
    await expect(voyage({ query: 'q', documents: docs })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
      message: expect.stringMatching(/malformed/),
    })

    const jinaFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        results: [
          { index: 0, relevance_score: Number.NaN },
        ],
      }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    const jina = jinaReranker({ apiKey: 'k', fetch: jinaFetch })
    await expect(jina({ query: 'q', documents: docs })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
    })
  })

  it('reorders valid voyage / jina results by score', async () => {
    const voyageFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        data: [
          { index: 1, relevance_score: 0.2 },
          { index: 0, relevance_score: 0.8 },
        ],
      }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    const voyage = voyageReranker({ apiKey: 'k', fetch: voyageFetch })
    const docs = [
      { id: 'a', content: 'A' },
      { id: 'b', content: 'B' },
    ]
    const vOut = await voyage({ query: 'q', documents: docs })
    expect(vOut.map(d => d.id)).toEqual(['a', 'b'])
    expect(vOut[0]!.score).toBe(0.8)

    const jinaFetch = vi.fn(async () =>
      new Response(JSON.stringify({
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.1 },
        ],
      }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    const jina = jinaReranker({ apiKey: 'k', fetch: jinaFetch })
    const jOut = await jina({ query: 'q', documents: docs })
    expect(jOut.map(d => d.id)).toEqual(['b', 'a'])
  })

  it('wraps voyage / jina network errors as AK_RAG_RERANK_FAILED', async () => {
    const boom = vi.fn(async () => { throw new Error('offline') }) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: boom })({ query: 'q', documents: [{ id: 'a', content: 'x' }] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })
    await expect(
      jinaReranker({ apiKey: 'k', fetch: boom })({ query: 'q', documents: [{ id: 'a', content: 'x' }] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })
  })

  it('throws AK_RAG_RERANK_FAILED on non-OK jina responses', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof globalThis.fetch
    await expect(
      jinaReranker({ apiKey: 'k', fetch })({ query: 'q', documents: [{ id: 'a', content: 'x' }] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/jina rerank: 500/) })
  })

  it('throws when voyage/jina response JSON or results array is invalid', async () => {
    const badJson = vi.fn(async () => new Response('not-json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: badJson })({ query: 'q', documents: [{ id: 'a', content: 'x' }] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/invalid JSON|data must be an array/) })

    const noArray = vi.fn(async () =>
      new Response(JSON.stringify({ results: null }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    await expect(
      jinaReranker({ apiKey: 'k', fetch: noArray })({ query: 'q', documents: [{ id: 'a', content: 'x' }] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/results must be an array/) })

    const voyageNoArray = vi.fn(async () =>
      new Response(JSON.stringify({ data: 'nope' }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: voyageNoArray })({ query: 'q', documents: [{ id: 'a', content: 'x' }] }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED', message: expect.stringMatching(/data must be an array/) })
  })

  it('does not swallow abort during GCS/Dropbox/OneDrive downloads', async () => {
    const controller = new AbortController()
    const gcsFetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (!u.includes('alt=media')) {
        return new Response(JSON.stringify({ items: [{ name: 'a.txt' }] }), { status: 200 })
      }
      controller.abort()
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    await expect(loadGcs({
      bucket: 'b',
      accessToken: 't',
      fetch: gcsFetch,
      signal: controller.signal,
    })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/aborted/) })

    const dbController = new AbortController()
    const dbFetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (!u.includes('/download')) {
        return new Response(JSON.stringify({
          entries: [{ '.tag': 'file', path_display: '/a.txt' }],
          has_more: false,
        }), { status: 200 })
      }
      dbController.abort()
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    await expect(loadDropbox({
      accessToken: 't',
      fetch: dbFetch,
      signal: dbController.signal,
    })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/aborted/) })

    const odController = new AbortController()
    const odFetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/children')) {
        return new Response(JSON.stringify({
          value: [{
            id: 'f1',
            name: 'a.txt',
            file: { mimeType: 'text/plain' },
            '@microsoft.graph.downloadUrl': 'https://cdn.example/a',
          }],
        }), { status: 200 })
      }
      odController.abort()
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    await expect(loadOneDrive({
      accessToken: 't',
      fetch: odFetch,
      signal: odController.signal,
    })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/aborted/) })
  })

  it('surfaces S3 list failures and aborted signals as AK_RAG_LOAD_FAILED', async () => {
    const client = {
      send: vi.fn(async () => { throw new Error('list boom') }),
    }
    await expect(loadS3({
      client,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/list failed/) })

    const controller = new AbortController()
    controller.abort()
    await expect(loadS3({
      client: { send: vi.fn() },
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
      signal: controller.signal,
    })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/aborted/) })
  })

  it('returns empty when maxFiles is zero for S3 / GCS / Dropbox / OneDrive', async () => {
    const send = vi.fn()
    expect(await loadS3({
      client: { send },
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
      maxFiles: 0,
    })).toEqual([])
    expect(send).not.toHaveBeenCalled()

    const fetch = vi.fn() as unknown as typeof globalThis.fetch
    expect(await loadGcs({ bucket: 'b', accessToken: 't', fetch, maxFiles: -2 })).toEqual([])
    expect(await loadDropbox({ accessToken: 't', fetch, maxFiles: Number.NaN })).toEqual([])
    expect(await loadOneDrive({ accessToken: 't', fetch, maxFiles: 0 })).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('wraps top-level response body read failures as AK_RAG_LOAD_FAILED', async () => {
    const bodyAbort = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => { throw new DOMException('Aborted', 'AbortError') },
      json: async () => { throw new DOMException('Aborted', 'AbortError') },
      arrayBuffer: async () => { throw new DOMException('Aborted', 'AbortError') },
    })) as unknown as typeof globalThis.fetch

    await expect(loadUrl('https://x', { fetch: bodyAbort })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/aborted/),
    })

    const bodyBoom = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => { throw new Error('stream reset') },
      json: async () => { throw new SyntaxError('Unexpected token') },
    })) as unknown as typeof globalThis.fetch

    await expect(loadUrl('https://x', { fetch: bodyBoom })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/response body|failed to read|failed to parse/i),
    })

    // List/tree JSON body failure is top-level — throw, not silent empty.
    const treeJsonFail = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return {
          ok: true,
          status: 200,
          json: async () => { throw new SyntaxError('bad json') },
          text: async () => '',
        }
      }
      return new Response('ok', { status: 200 })
    }) as unknown as typeof globalThis.fetch
    await expect(loadGitHubTree('o', 'r', { fetch: treeJsonFail })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
    })
  })

  it('counts tree download body failures toward partial / all-failed accounting', async () => {
    const fetch = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return new Response(JSON.stringify({
          tree: [
            { path: 'ok.md', type: 'blob' },
            { path: 'bad.md', type: 'blob' },
          ],
        }), { status: 200 })
      }
      if (u.includes('bad.md')) {
        return {
          ok: true,
          status: 200,
          text: async () => { throw new Error('body read failed') },
        }
      }
      return new Response('ok-body', { status: 200 })
    }) as unknown as typeof globalThis.fetch

    const partial = await loadGitHubTree('o', 'r', { fetch })
    expect(partial).toHaveLength(1)
    expect(partial[0]!.metadata?.path).toBe('ok.md')

    const allFail = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('/git/trees/')) {
        return new Response(JSON.stringify({
          tree: [{ path: 'a.md', type: 'blob' }],
        }), { status: 200 })
      }
      return {
        ok: true,
        status: 200,
        text: async () => { throw new Error('body read failed') },
      }
    }) as unknown as typeof globalThis.fetch
    await expect(loadGitHubTree('o', 'r', { fetch: allFail })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/all eligible downloads failed/),
    })
  })

  it('treats missing/invalid S3 Body.transformToString as a failed download', async () => {
    const missingBody = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          return { Contents: [{ Key: 'a' }, { Key: 'b' }], IsTruncated: false }
        }
        if (cmd.input.Key === 'a') return {} // missing Body
        return { Body: { transformToString: async () => 'ok' } }
      }),
    }
    const docs = await loadS3({
      client: missingBody,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]!.metadata?.key).toBe('b')
    expect(docs[0]!.content).toBe('ok')

    const invalidBody = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          return { Contents: [{ Key: 'a' }], IsTruncated: false }
        }
        return { Body: { transformToString: 'not-a-function' } }
      }),
    }
    await expect(loadS3({
      client: invalidBody,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/all eligible downloads failed/),
    })

    const bodyThrows = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          return { Contents: [{ Key: 'a' }], IsTruncated: false }
        }
        return {
          Body: {
            transformToString: async () => { throw new Error('stream failed') },
          },
        }
      }),
    }
    await expect(loadS3({
      client: bodyThrows,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/all eligible downloads failed/),
    })

    const bodyAbort = {
      send: vi.fn(async (cmd: { input: Record<string, unknown> }) => {
        if (!('Key' in cmd.input)) {
          return { Contents: [{ Key: 'a' }], IsTruncated: false }
        }
        return {
          Body: {
            transformToString: async () => { throw new DOMException('Aborted', 'AbortError') },
          },
        }
      }),
    }
    await expect(loadS3({
      client: bodyAbort,
      bucket: 'bk',
      commands: { ListObjectsV2Command: ListCmd, GetObjectCommand: GetCmd },
    })).rejects.toMatchObject({
      code: 'AK_RAG_LOAD_FAILED',
      message: expect.stringMatching(/aborted/),
    })
  })

  it('voyage/jina body-read failures always throw AK_RAG_RERANK_FAILED (incl. AbortError)', async () => {
    const docs = [{ id: 'a', content: 'A' }]

    const nonOkTextAbort = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => { throw new DOMException('Aborted', 'AbortError') },
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: nonOkTextAbort })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })
    await expect(
      jinaReranker({ apiKey: 'k', fetch: nonOkTextAbort })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })

    const nonOkTextBoom = vi.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => { throw new Error('body gone') },
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: nonOkTextBoom })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })

    const jsonAbort = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => { throw new DOMException('Aborted', 'AbortError') },
    })) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: jsonAbort })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })
    await expect(
      jinaReranker({ apiKey: 'k', fetch: jsonAbort })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })

    const jsonSyntax = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => 'not-json',
      json: async () => { throw new SyntaxError('Unexpected token') },
    })) as unknown as typeof globalThis.fetch
    await expect(
      voyageReranker({ apiKey: 'k', fetch: jsonSyntax })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })
    await expect(
      jinaReranker({ apiKey: 'k', fetch: jsonSyntax })({ query: 'q', documents: docs }),
    ).rejects.toMatchObject({ code: 'AK_RAG_RERANK_FAILED' })
  })
})
