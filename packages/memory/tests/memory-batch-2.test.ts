import { describe, it, expect, vi } from 'vitest'
import {
  weaviateVectorStore,
  milvusVectorStore,
  mongoAtlasVectorStore,
} from '../src/vector/index'

function fakeFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(String(input), init ?? {})
  ) as unknown as typeof fetch
}

describe('weaviateVectorStore', () => {
  it('store batches via /v1/batch/objects', async () => {
    let url = ''
    let body: Record<string, unknown> = {}
    const fetchMock = fakeFetch((u, init) => {
      url = u
      body = JSON.parse(String(init.body))
      return new Response('[]', { status: 200 })
    })
    const store = weaviateVectorStore({
      url: 'https://x.weaviate.network',
      className: 'Doc',
      fetch: fetchMock,
    })
    await store.store([{ id: '1', content: 'a', embedding: [0.1, 0.2] }])
    expect(url).toBe('https://x.weaviate.network/v1/batch/objects')
    const objects = (body.objects as Array<Record<string, unknown>>) ?? []
    expect(objects[0].class).toBe('Doc')
  })

  it('search uses GraphQL nearVector', async () => {
    let body: Record<string, unknown> = {}
    const fetchMock = fakeFetch((_u, init) => {
      body = JSON.parse(String(init.body))
      return new Response(JSON.stringify({
        data: { Get: { Doc: [{ content: 'hi', _additional: { id: '1', certainty: 0.9 } }] } },
      }))
    })
    const store = weaviateVectorStore({
      url: 'https://x.weaviate.network',
      className: 'Doc',
      fetch: fetchMock,
    })
    const result = await store.search([0.1, 0.2], { topK: 3 })
    expect(String(body.query)).toContain('nearVector')
    expect(result[0].score).toBe(0.9)
  })
})

describe('milvusVectorStore', () => {
  it('store hits /v2/vectordb/entities/upsert', async () => {
    let url = ''
    const fetchMock = fakeFetch((u) => { url = u; return new Response('{}') })
    const store = milvusVectorStore({
      url: 'https://x.zillizcloud.com',
      collection: 'docs',
      fetch: fetchMock,
    })
    await store.store([{ id: '1', content: 'a', embedding: [0.1] }])
    expect(url).toContain('/v2/vectordb/entities/upsert')
  })

  it('search converts distance to similarity score', async () => {
    const fetchMock = fakeFetch(() => new Response(JSON.stringify({
      data: [{ id: '1', distance: 0.2, content: 'hi' }],
    })))
    const store = milvusVectorStore({
      url: 'https://x.zillizcloud.com',
      collection: 'docs',
      fetch: fetchMock,
    })
    const result = await store.search([0.1])
    expect(result[0].score).toBeCloseTo(0.8)
  })
})

describe('mongoAtlasVectorStore', () => {
  it('store inserts with _id + embedding field', async () => {
    const inserted: Array<Record<string, unknown>> = []
    const collection = {
      insertMany: vi.fn(async (docs: Array<Record<string, unknown>>) => { inserted.push(...docs) }),
      deleteMany: vi.fn(async () => undefined),
      aggregate: vi.fn(),
    }
    const store = mongoAtlasVectorStore({ collection, indexName: 'idx' })
    await store.store([{ id: 'a1', content: 'x', embedding: [0.1] }])
    expect(inserted[0]._id).toBe('a1')
    expect((inserted[0] as { embedding: unknown }).embedding).toEqual([0.1])
  })

  it('search builds a $vectorSearch pipeline', async () => {
    const captured: Array<Array<Record<string, unknown>>> = []
    const collection = {
      insertMany: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn((pipeline: Array<Record<string, unknown>>) => {
        captured.push(pipeline)
        return { toArray: async () => [{ _id: 'a1', content: 'x', score: 0.9 }] }
      }),
    }
    const store = mongoAtlasVectorStore({ collection, indexName: 'idx' })
    const result = await store.search([0.1], { topK: 5 })
    expect(captured[0][0]).toHaveProperty('$vectorSearch')
    expect((captured[0][0].$vectorSearch as { limit: number }).limit).toBe(5)
    expect(result[0].score).toBe(0.9)
  })

  it('delete uses $in on _id', async () => {
    let filter: Record<string, unknown> = {}
    const collection = {
      insertMany: vi.fn(),
      deleteMany: vi.fn(async (f: Record<string, unknown>) => { filter = f }),
      aggregate: vi.fn(),
    }
    const store = mongoAtlasVectorStore({ collection, indexName: 'idx' })
    await store.delete!(['a', 'b'])
    expect(filter._id).toEqual({ $in: ['a', 'b'] })
  })
})
