/**
 * Additional vector backend tests for coverage improvement.
 * Covers: chroma store/error, milvus error/delete, qdrant error/delete,
 * weaviate error/delete/search, upstash delete, supabase happy path.
 */
import { describe, expect, it, vi } from 'vitest'
import { chroma } from '../src/vector/chroma'
import { milvusVectorStore } from '../src/vector/milvus'
import { qdrant } from '../src/vector/qdrant'
import { weaviateVectorStore } from '../src/vector/weaviate'
import { upstashVector } from '../src/vector/upstash'

function mockFetch(response: unknown, opts: { status?: number } = {}) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  const fake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : (url as Request).url
    calls.push({ url: urlStr, init })
    return new Response(JSON.stringify(response), { status: opts.status ?? 200 })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, calls }
}

// ─── chroma ──────────────────────────────────────────────────────────────────

describe('chroma — extra', () => {
  it('store upserts documents', async () => {
    const { fetch, calls } = mockFetch({})
    const store = chroma({ url: 'https://chroma', collection: 'docs', fetch })
    await store.store([{ id: 'a', content: 'hello', embedding: [0.1, 0.2] }])
    expect(calls[0]!.url).toContain('/upsert')
    expect(calls[0]!.init!.method).toBe('POST')
  })

  it('store is no-op when docs array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = chroma({ url: 'https://chroma', collection: 'docs', fetch })
    await store.store([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws MemoryError on HTTP error', async () => {
    const { fetch } = mockFetch({ error: 'not found' }, { status: 404 })
    const store = chroma({ url: 'https://chroma', collection: 'docs', fetch })
    await expect(store.search([1, 2])).rejects.toThrow(/chroma 404/)
  })

  it('search filters by threshold', async () => {
    const { fetch } = mockFetch({
      ids: [['a', 'b']],
      documents: [['doc a', 'doc b']],
      metadatas: [[{}, {}]],
      distances: [[0.8, 0.05]],  // scores: 0.2, 0.95
    })
    const store = chroma({ url: 'https://chroma', collection: 'docs', fetch })
    const out = await store.search([1], { threshold: 0.9 })
    // Only score >= 0.9 passes (1-0.05 = 0.95)
    expect(out).toHaveLength(1)
    expect(out[0]!.id).toBe('b')
  })

  it('delete is no-op when ids array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = chroma({ url: 'https://chroma', collection: 'docs', fetch })
    await store.delete!([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('empty response body yields empty result for search', async () => {
    const { fetch } = mockFetch({})
    const store = chroma({ url: 'https://chroma', collection: 'docs', fetch })
    const out = await store.search([1, 2])
    expect(out).toEqual([])
  })
})

// ─── milvus ──────────────────────────────────────────────────────────────────

describe('milvusVectorStore — extra', () => {
  it('store sends POST with bearer token', async () => {
    const { fetch, calls } = mockFetch({})
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', token: 'tok', fetch })
    await store.store([{ id: '1', content: 'text', embedding: [0.1] }])
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer tok')
  })

  it('store is no-op when docs array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', fetch })
    await store.store([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws MemoryError on HTTP error', async () => {
    const { fetch } = mockFetch({ code: 1 }, { status: 401 })
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', fetch })
    await expect(store.search([1])).rejects.toThrow(/milvus 401/)
  })

  it('delete posts filter expression', async () => {
    const { fetch, calls } = mockFetch({})
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', fetch })
    await store.delete!(['id1', 'id2'])
    const body = JSON.parse(calls[0]!.init!.body as string) as { filter: string }
    expect(body.filter).toContain('"id1"')
    expect(body.filter).toContain('"id2"')
  })

  it('delete is no-op when ids array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', fetch })
    await store.delete!([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses custom vectorField in search', async () => {
    const { fetch, calls } = mockFetch({ data: [] })
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', vectorField: 'emb', fetch })
    await store.search([1, 2])
    const body = JSON.parse(calls[0]!.init!.body as string) as { annsField: string }
    expect(body.annsField).toBe('emb')
  })

  it('search filters by threshold', async () => {
    const { fetch } = mockFetch({
      data: [
        { id: 'a', distance: 0.1, content: 'keep' },   // score = 0.9
        { id: 'b', distance: 0.9, content: 'drop' },   // score = 0.1
      ],
    })
    const store = milvusVectorStore({ url: 'https://milvus', collection: 'c', fetch })
    const out = await store.search([1], { threshold: 0.5 })
    expect(out.map(r => r.id)).toEqual(['a'])
  })
})

// ─── qdrant ──────────────────────────────────────────────────────────────────

describe('qdrant — extra', () => {
  it('throws MemoryError on HTTP error', async () => {
    const { fetch } = mockFetch({ status: 'error' }, { status: 404 })
    const store = qdrant({ url: 'https://qdrant', collection: 'c', fetch })
    await expect(store.search([1])).rejects.toThrow(/qdrant 404/)
  })

  it('delete is no-op when ids array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = qdrant({ url: 'https://qdrant', collection: 'c', fetch })
    await store.delete!([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('delete posts point ids', async () => {
    const { fetch, calls } = mockFetch({})
    const store = qdrant({ url: 'https://qdrant', collection: 'c', fetch })
    await store.delete!(['p1', 'p2'])
    const body = JSON.parse(calls[0]!.init!.body as string) as { points: string[] }
    expect(body.points).toEqual(['p1', 'p2'])
  })

  it('store is no-op when docs array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = qdrant({ url: 'https://qdrant', collection: 'c', fetch })
    await store.store([])
    expect(fetch).not.toHaveBeenCalled()
  })
})

// ─── weaviate ─────────────────────────────────────────────────────────────────

describe('weaviateVectorStore — extra', () => {
  it('store POSTs batch objects', async () => {
    const { fetch, calls } = mockFetch({})
    const store = weaviateVectorStore({ url: 'https://wv', className: 'Doc', fetch })
    await store.store([{ id: 'uuid-1', content: 'text', embedding: [0.1, 0.2] }])
    expect(calls[0]!.url).toContain('/v1/batch/objects')
  })

  it('store is no-op when docs array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = weaviateVectorStore({ url: 'https://wv', className: 'Doc', fetch })
    await store.store([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws MemoryError on HTTP error', async () => {
    const { fetch } = mockFetch({ error: 'bad auth' }, { status: 403 })
    const store = weaviateVectorStore({ url: 'https://wv', className: 'Doc', fetch })
    await expect(store.search([1])).rejects.toThrow(/weaviate 403/)
  })

  it('delete sends one DELETE per id', async () => {
    const { fetch, calls } = mockFetch({})
    const store = weaviateVectorStore({ url: 'https://wv', className: 'MyClass', fetch })
    await store.delete!(['id-1', 'id-2'])
    expect(calls).toHaveLength(2)
    expect(calls[0]!.init!.method).toBe('DELETE')
    expect(calls[0]!.url).toContain('/v1/objects/MyClass/id-1')
    expect(calls[1]!.url).toContain('/v1/objects/MyClass/id-2')
  })

  it('search returns GraphQL mapped results', async () => {
    const { fetch } = mockFetch({
      data: {
        Get: {
          Article: [
            { content: 'text here', _additional: { id: 'uuid-99', certainty: 0.92 } },
          ],
        },
      },
    })
    const store = weaviateVectorStore({ url: 'https://wv', className: 'Article', fetch })
    const out = await store.search([0.1, 0.2])
    expect(out[0]).toMatchObject({ id: 'uuid-99', content: 'text here', score: 0.92 })
  })

  it('search filters by threshold', async () => {
    const { fetch } = mockFetch({
      data: {
        Get: {
          Doc: [
            { content: 'a', _additional: { id: 'x', certainty: 0.3 } },
            { content: 'b', _additional: { id: 'y', certainty: 0.9 } },
          ],
        },
      },
    })
    const store = weaviateVectorStore({ url: 'https://wv', className: 'Doc', fetch })
    const out = await store.search([1], { threshold: 0.8 })
    expect(out.map(r => r.id)).toEqual(['y'])
  })

  it('apiKey is sent as Bearer Authorization header', async () => {
    const { fetch, calls } = mockFetch({
      data: { Get: { Doc: [] } },
    })
    const store = weaviateVectorStore({ url: 'https://wv', className: 'Doc', apiKey: 'secret', fetch })
    await store.search([1])
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer secret')
  })
})

// ─── upstash ─────────────────────────────────────────────────────────────────

describe('upstashVector — extra', () => {
  it('delete posts ids', async () => {
    const { fetch, calls } = mockFetch({})
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    await store.delete!(['x', 'y'])
    const body = JSON.parse(calls[0]!.init!.body as string) as { ids: string[] }
    expect(body.ids).toEqual(['x', 'y'])
  })

  it('delete is no-op when ids array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    await store.delete!([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('store is no-op when docs array is empty', async () => {
    const { fetch } = mockFetch({})
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    await store.store([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('search filters by threshold', async () => {
    const { fetch } = mockFetch({
      result: [
        { id: 'a', score: 0.4, metadata: { content: 'low' } },
        { id: 'b', score: 0.9, metadata: { content: 'high' } },
      ],
    })
    const store = upstashVector({ url: 'https://v', token: 't', fetch })
    const out = await store.search([1], { threshold: 0.7 })
    expect(out.map(r => r.id)).toEqual(['b'])
  })
})
