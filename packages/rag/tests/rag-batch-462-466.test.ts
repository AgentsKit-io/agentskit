import { describe, it, expect, vi } from 'vitest'
import {
  loadS3,
  loadGcs,
  loadDropbox,
  loadOneDrive,
  voyageReranker,
  jinaReranker,
} from '../src/index'

function fakeFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    impl(String(input), init ?? {})
  ) as unknown as typeof fetch
}

// Mock the SDK command classes so tests don't pull @aws-sdk/client-s3.
const FakeCommands = {
  ListObjectsV2Command: class { input: Record<string, unknown>; constructor(input: Record<string, unknown>) { this.input = input } },
  GetObjectCommand: class { input: Record<string, unknown>; constructor(input: Record<string, unknown>) { this.input = input } },
}

describe('loadS3', () => {
  it('lists + fetches objects via the injected client', async () => {
    const client = {
      send: vi.fn()
        .mockResolvedValueOnce({ Contents: [{ Key: 'a.txt' }, { Key: 'b.txt' }], IsTruncated: false })
        .mockResolvedValueOnce({ Body: { transformToString: async () => 'hello A' } })
        .mockResolvedValueOnce({ Body: { transformToString: async () => 'hello B' } }),
    }
    const docs = await loadS3({ client, bucket: 'b1', commands: FakeCommands })
    expect(docs).toHaveLength(2)
    expect(docs[0].source).toBe('s3://b1/a.txt')
    expect(docs[0].content).toBe('hello A')
  })

  it('honours filter and maxFiles', async () => {
    const client = {
      send: vi.fn()
        .mockResolvedValueOnce({
          Contents: [{ Key: 'keep.txt' }, { Key: 'skip.bin' }, { Key: 'keep2.txt' }],
          IsTruncated: false,
        })
        .mockResolvedValue({ Body: { transformToString: async () => 'x' } }),
    }
    const docs = await loadS3({
      client,
      bucket: 'b1',
      commands: FakeCommands,
      filter: k => k.endsWith('.txt'),
      maxFiles: 1,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].source).toBe('s3://b1/keep.txt')
  })
})

describe('loadGcs', () => {
  it('walks bucket pages and downloads with the access token', async () => {
    let listed = 0
    const fetchMock = fakeFetch((url) => {
      if (url.includes('?prefix') || url.endsWith('/o') || url.includes('/o?')) {
        listed++
        if (listed === 1) {
          return new Response(JSON.stringify({
            items: [{ name: 'doc.txt' }],
            nextPageToken: undefined,
          }))
        }
      }
      return new Response('content')
    })
    const docs = await loadGcs({
      bucket: 'b1',
      accessToken: 'ya29.token',
      fetch: fetchMock,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0].source).toBe('gs://b1/doc.txt')
    expect(docs[0].content).toBe('content')
  })

  it('accepts an async accessToken', async () => {
    let captured: string | undefined
    const fetchMock = fakeFetch((_url, init) => {
      captured = (init.headers as Record<string, string>)?.authorization
      return new Response(JSON.stringify({ items: [] }))
    })
    await loadGcs({
      bucket: 'b1',
      accessToken: async () => 'dynamic',
      fetch: fetchMock,
    })
    expect(captured).toBe('Bearer dynamic')
  })
})

describe('loadDropbox', () => {
  it('lists folder + downloads each file', async () => {
    const fetchMock = fakeFetch((url) => {
      if (url.endsWith('/list_folder')) {
        return new Response(JSON.stringify({
          entries: [
            { '.tag': 'file', path_display: '/docs/a.md' },
            { '.tag': 'folder', path_display: '/docs/sub' },
          ],
          has_more: false,
        }))
      }
      if (url.endsWith('/download')) {
        return new Response('# Hello')
      }
      return new Response('', { status: 404 })
    })
    const docs = await loadDropbox({ accessToken: 'sl.token', path: '/docs', fetch: fetchMock })
    expect(docs).toHaveLength(1)
    expect(docs[0].source).toBe('dropbox:/docs/a.md')
    expect(docs[0].content).toBe('# Hello')
  })
})

describe('loadOneDrive', () => {
  it('walks children + downloads files', async () => {
    const fetchMock = fakeFetch((url) => {
      if (url.endsWith('/root/children')) {
        return new Response(JSON.stringify({
          value: [
            { id: 'f1', name: 'a.txt', file: { mimeType: 'text/plain' }, '@microsoft.graph.downloadUrl': 'https://dl.example/a' },
          ],
        }))
      }
      if (url.startsWith('https://dl.example/')) return new Response('A')
      return new Response('', { status: 404 })
    })
    const docs = await loadOneDrive({ accessToken: 'msal.token', fetch: fetchMock })
    expect(docs).toHaveLength(1)
    expect(docs[0].metadata?.name).toBe('a.txt')
    expect(docs[0].content).toBe('A')
  })
})

describe('voyageReranker', () => {
  it('returns documents in voyage-supplied order with new scores', async () => {
    const fetchMock = fakeFetch(() => new Response(JSON.stringify({
      data: [
        { index: 1, relevance_score: 0.9 },
        { index: 0, relevance_score: 0.4 },
      ],
    })))
    const fn = voyageReranker({ apiKey: 'pa-test', fetch: fetchMock })
    const docs = [
      { id: 'a', content: 'doc A', score: 0.5 },
      { id: 'b', content: 'doc B', score: 0.5 },
    ]
    const out = await fn({ query: 'q', documents: docs })
    expect(out.map(d => d.id)).toEqual(['b', 'a'])
    expect(out[0].score).toBe(0.9)
  })

  it('throws on non-2xx', async () => {
    const fetchMock = fakeFetch(() => new Response('rate limited', { status: 429 }))
    const fn = voyageReranker({ apiKey: 'k', fetch: fetchMock })
    await expect(fn({ query: 'q', documents: [{ id: 'a', content: 'x' }] })).rejects.toThrow(/voyage rerank/)
  })

  it('forwards optional signal and maps abort to AK_RAG_RERANK_FAILED', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal)
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    const fn = voyageReranker({ apiKey: 'k', fetch: fetchMock, signal: controller.signal })
    await expect(fn({ query: 'q', documents: [{ id: 'a', content: 'x' }] })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.voyageai.com/v1/rerank',
      expect.objectContaining({ signal: controller.signal }),
    )
  })
})

describe('jinaReranker', () => {
  it('returns documents in jina-supplied order', async () => {
    const fetchMock = fakeFetch(() => new Response(JSON.stringify({
      results: [
        { index: 0, relevance_score: 0.95 },
        { index: 1, relevance_score: 0.30 },
      ],
    })))
    const fn = jinaReranker({ apiKey: 'jina-test', fetch: fetchMock })
    const out = await fn({
      query: 'q',
      documents: [
        { id: 'a', content: 'doc A' },
        { id: 'b', content: 'doc B' },
      ],
    })
    expect(out.map(d => d.id)).toEqual(['a', 'b'])
    expect(out[0].score).toBe(0.95)
  })

  it('forwards optional signal and maps abort to AK_RAG_RERANK_FAILED', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBe(controller.signal)
      throw new DOMException('Aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    const fn = jinaReranker({ apiKey: 'k', fetch: fetchMock, signal: controller.signal })
    await expect(fn({ query: 'q', documents: [{ id: 'a', content: 'x' }] })).rejects.toMatchObject({
      code: 'AK_RAG_RERANK_FAILED',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.jina.ai/v1/rerank',
      expect.objectContaining({ signal: controller.signal }),
    )
  })
})
