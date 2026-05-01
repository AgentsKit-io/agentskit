import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOpenAiEmbedder } from '../src/extensibility/rag/embedders'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

describe('createOpenAiEmbedder', () => {
  it('posts to /v1/embeddings with Bearer auth and returns first embedding', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      return new Response(
        JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }) as unknown as typeof fetch
    const embed = createOpenAiEmbedder({ apiKey: 'sk-test' })
    const v = await embed('hello world')
    expect(v).toEqual([0.1, 0.2, 0.3])
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/embeddings')
    const headers = calls[0]!.init?.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer sk-test')
    expect(JSON.parse(calls[0]!.init?.body as string)).toEqual({
      model: 'text-embedding-3-small',
      input: 'hello world',
    })
  })

  it('strips trailing slash on baseUrl and uses custom model', async () => {
    const calls: Array<{ url: string }> = []
    globalThis.fetch = vi.fn(async (url: unknown) => {
      calls.push({ url: String(url) })
      return new Response(JSON.stringify({ data: [{ embedding: [1] }] }), { status: 200 })
    }) as unknown as typeof fetch
    const embed = createOpenAiEmbedder({
      apiKey: 'sk-x',
      model: 'voyage-3',
      baseUrl: 'https://api.voyageai.com/',
    })
    await embed('hi')
    expect(calls[0]!.url).toBe('https://api.voyageai.com/v1/embeddings')
  })

  it('throws on non-2xx with body', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('rate limited', { status: 429 }),
    ) as unknown as typeof fetch
    const embed = createOpenAiEmbedder({ apiKey: 'sk-test' })
    await expect(embed('hi')).rejects.toThrow(/HTTP 429/)
  })

  it('throws when response is missing data[0].embedding', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 }),
    ) as unknown as typeof fetch
    const embed = createOpenAiEmbedder({ apiKey: 'sk-test' })
    await expect(embed('hi')).rejects.toThrow(/missing data/)
  })
})
