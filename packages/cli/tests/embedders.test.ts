import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
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

  it('bounds streamed localhost responses and accepts a normal response', async () => {
    let requests = 0
    const server = createServer((request, response) => {
      if (requests++ > 0) {
        response.writeHead(200)
        response.write(Buffer.alloc(1024 * 1024 + 1, 0x61))
        response.end()
        return
      }
      response.writeHead(200, { 'content-type': 'application/json' })
      response.write('{"data":')
      response.end('[{"embedding":[0.4,0.5]}]}')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Expected a localhost TCP address')
    try {
      const embed = createOpenAiEmbedder({ apiKey: 'sk-test', baseUrl: `http://127.0.0.1:${address.port}` })
      await expect(embed('ok')).resolves.toEqual([0.4, 0.5])
      await expect(embed('too large')).rejects.toMatchObject({
        cause: { code: 'AK_NET_BODY_TOO_LARGE' },
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
