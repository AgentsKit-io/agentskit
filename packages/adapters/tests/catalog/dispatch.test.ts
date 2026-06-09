import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CatalogDispatchError, dispatchFromCatalog } from '../../src/catalog'

interface Capture {
  url?: string
  auth?: string
  body?: string
}

let originalFetch: typeof globalThis.fetch
beforeEach(() => {
  originalFetch = globalThis.fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

function sseResponse(): Response {
  const body = [
    'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
    'data: [DONE]\n\n',
  ].join('')
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  })
}

function mockFetch(cap: Capture): void {
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    cap.url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    cap.auth = (init?.headers as Record<string, string> | undefined)?.['Authorization']
    cap.body = init?.body as string
    return sseResponse()
  }) as typeof globalThis.fetch
}

async function drain(factory: ReturnType<typeof dispatchFromCatalog>): Promise<string> {
  const source = factory.createSource({
    messages: [
      { id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) },
    ],
  })
  let text = ''
  for await (const ev of source.stream()) {
    if (ev.type === 'text') text += ev.content
  }
  return text
}

describe('dispatchFromCatalog', () => {
  it('dispatches an openai-compatible provider against its catalog base URL', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    const factory = dispatchFromCatalog({ provider: 'deepseek', model: 'deepseek-chat', apiKey: 'sk-test' })
    const text = await drain(factory)
    expect(text).toBe('hi')
    expect(cap.url).toContain('api.deepseek.com')
    expect(cap.url).toContain('/chat/completions')
    expect(cap.auth).toBe('Bearer sk-test')
    expect(cap.body).toContain('deepseek-chat')
  })

  it('honours an explicit baseUrl override (proxy/gateway)', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    const factory = dispatchFromCatalog({
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'sk-test',
      baseUrl: 'https://gateway.internal/v1',
    })
    await drain(factory)
    expect(cap.url).toContain('gateway.internal')
  })

  it('throws typed error for unknown provider', () => {
    expect(() => dispatchFromCatalog({ provider: 'nope', model: 'x', apiKey: 'k' }))
      .toThrowError(expect.objectContaining({ code: 'UNKNOWN_PROVIDER' }))
  })

  it('throws typed error for a non-openai-compatible provider', () => {
    let err: unknown
    try {
      dispatchFromCatalog({ provider: 'anthropic', model: 'claude', apiKey: 'k' })
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(CatalogDispatchError)
    expect((err as CatalogDispatchError).code).toBe('NOT_OPENAI_COMPATIBLE')
  })
})
