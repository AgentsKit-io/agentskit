import { describe, expect, it, vi } from 'vitest'
import { chroma, pgvector, pinecone, qdrant, upstashVector } from '../src/vector'

function mockFetch(response: unknown, opts: { status?: number } = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: typeof url === 'string' ? url : url instanceof URL ? url.href : url.url, init })
    return new Response(JSON.stringify(response), { status: opts.status ?? 200 })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, calls }
}

describe('pgvector', () => {
  const runner = {
    query: vi.fn(async () => ({ rows: [] as Array<Record<string, unknown>> })),
  }

  it('store builds batched INSERT', async () => {
    runner.query.mockResolvedValueOnce({ rows: [] })
    const store = pgvector({ runner })
    await store.store([{ id: 'a', content: 'hello', embedding: [0.1, 0.2], metadata: { k: 1 } }])
    expect(runner.query).toHaveBeenCalled()
    const [sql, params] = runner.query.mock.calls[0]!
    expect(sql).toContain('INSERT INTO agentskit_vectors')
    expect(params[0]).toBe('a')
    expect(params[2]).toBe('[0.1,0.2]')
  })

  it('search converts distance to score', async () => {
    runner.query.mockResolvedValueOnce({
      rows: [{ id: 'a', content: 'hi', metadata: null, distance: 0.2 }],
    })
    const store = pgvector({ runner })
    const out = await store.search([1], { topK: 1 })
    expect(out[0]!.score).toBeCloseTo(0.8, 5)
  })

  it('delete builds parameterized DELETE', async () => {
    runner.query.mockClear()
    runner.query.mockResolvedValueOnce({ rows: [] })
    const store = pgvector({ runner })
    await store.delete!(['a', 'b'])
    expect(runner.query.mock.calls[0]![0]).toContain('DELETE')
    expect(runner.query.mock.calls[0]![1]).toEqual(['a', 'b'])
  })

  it('no-op on empty arrays', async () => {
    runner.query.mockClear()
    const store = pgvector({ runner })
    await store.store([])
    await store.delete!([])
    expect(runner.query).not.toHaveBeenCalled()
  })
})

describe('pinecone', () => {
  it('store upserts via /vectors/upsert', async () => {
    const { fetch, calls } = mockFetch({})
    const store = pinecone({ apiKey: 'k', indexUrl: 'https://idx', fetch })
    await store.store([{ id: 'a', content: 'x', embedding: [1] }])
    expect(calls[0]!.url).toBe('https://idx/vectors/upsert')
    expect(JSON.parse(calls[0]!.init!.body as string)).toMatchObject({ namespace: '' })
  })

  it('search maps matches into RetrievedDocuments', async () => {
    const { fetch } = mockFetch({
      matches: [{ id: 'a', score: 0.9, metadata: { content: 'hi' } }],
    })
    const store = pinecone({ apiKey: 'k', indexUrl: 'https://idx', fetch })
    const out = await store.search([1, 2])
    expect(out[0]).toMatchObject({ id: 'a', content: 'hi', score: 0.9 })
  })

  it('delete posts ids', async () => {
    const { fetch, calls } = mockFetch({})
    const store = pinecone({ apiKey: 'k', indexUrl: 'https://idx', fetch })
    await store.delete!(['a'])
    expect(calls[0]!.url).toBe('https://idx/vectors/delete')
  })
})

describe('qdrant', () => {
  it('store uses PUT collections/*/points', async () => {
    const { fetch, calls } = mockFetch({})
    const store = qdrant({ url: 'https://q', collection: 'c', fetch })
    await store.store([{ id: 'a', content: 'x', embedding: [1] }])
    expect(calls[0]!.init!.method).toBe('PUT')
    expect(calls[0]!.url).toContain('/collections/c/points')
  })

  it('search maps scored points', async () => {
    const { fetch } = mockFetch({
      result: [{ id: 42, score: 0.77, payload: { content: 'hello' } }],
    })
    const store = qdrant({ url: 'https://q', collection: 'c', fetch, apiKey: 'k' })
    const out = await store.search([1])
    expect(out[0]).toMatchObject({ id: '42', content: 'hello', score: 0.77 })
  })
})

describe('chroma', () => {
  it('search flattens per-query arrays', async () => {
    const { fetch } = mockFetch({
      ids: [['a', 'b']],
      documents: [['first', 'second']],
      metadatas: [[{ x: 1 }, { x: 2 }]],
      distances: [[0.1, 0.3]],
    })
    const store = chroma({ url: 'https://chroma', collection: 'c', fetch })
    const out = await store.search([1])
    expect(out.map(r => r.id)).toEqual(['a', 'b'])
    expect(out[0]!.score).toBeCloseTo(0.9, 5)
  })

  it('delete posts ids', async () => {
    const { fetch, calls } = mockFetch({})
    const store = chroma({ url: 'https://chroma', collection: 'c', fetch })
    await store.delete!(['a'])
    expect(calls[0]!.url).toContain('/delete')
  })
})

describe('upstashVector', () => {
  it('store upserts via /upsert with bearer token', async () => {
    const { fetch, calls } = mockFetch({})
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    await store.store([{ id: 'a', content: 'x', embedding: [1] }])
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer t')
  })

  it('search returns metadata-embedded content', async () => {
    const { fetch } = mockFetch({ result: [{ id: 'a', score: 0.5, metadata: { content: 'hi' } }] })
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    const out = await store.search([1])
    expect(out[0]).toMatchObject({ id: 'a', content: 'hi', score: 0.5 })
  })

  it('throws on non-ok', async () => {
    const { fetch } = mockFetch({ error: 'bad' }, { status: 401 })
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    await expect(store.search([1])).rejects.toThrow(/upstash-vector 401/)
  })
})
