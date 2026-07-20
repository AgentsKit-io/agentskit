import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { gemini } from '../src/gemini'

interface Capture {
  url?: string
  headers?: Record<string, string>
  body?: unknown
}

let originalFetch: typeof globalThis.fetch
beforeEach(() => {
  originalFetch = globalThis.fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

function mockFetch(cap: Capture): void {
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    cap.url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const headers = init?.headers
    if (headers instanceof Headers) {
      cap.headers = Object.fromEntries(headers.entries())
    } else if (Array.isArray(headers)) {
      cap.headers = Object.fromEntries(headers)
    } else {
      cap.headers = { ...(headers as Record<string, string> | undefined) }
    }
    cap.body = init?.body
    throw new Error('stub')
  }) as typeof globalThis.fetch
}

async function drain(factory: ReturnType<typeof gemini>): Promise<void> {
  const source = factory.createSource({
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
  })
  const iter = source.stream()[Symbol.asyncIterator]()
  try {
    while (!(await iter.next()).done) {
      /* drain */
    }
  } catch {
    /* expected when fetch stubs throw */
  }
}

describe('gemini adapter wire format', () => {
  it('sends API key via x-goog-api-key header, never URL query', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(gemini({ apiKey: 'secret-key', model: 'gemini-2.5-flash', retry: { maxAttempts: 1, sleep: async () => {} } }))

    expect(cap.url).toBeDefined()
    const url = new URL(cap.url!)
    expect(url.searchParams.has('key')).toBe(false)
    expect(cap.url).not.toMatch(/[?&]key=/)

    const headerKey =
      cap.headers?.['x-goog-api-key'] ??
      cap.headers?.['X-Goog-Api-Key'] ??
      cap.headers?.['X-GOOG-API-KEY']
    expect(headerKey).toBe('secret-key')
  })

  it('serializes context tools as functionDeclarations', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    const factory = gemini({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      retry: { maxAttempts: 1, sleep: async () => {} },
    })
    const source = factory.createSource({
      messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
      context: {
        tools: [{ name: 'lookup', description: 'lookup user', schema: { type: 'object' } }],
      },
    })
    const iter = source.stream()[Symbol.asyncIterator]()
    try {
      while (!(await iter.next()).done) {
        /* drain */
      }
    } catch {
      /* expected */
    }

    expect(cap.body).toBeDefined()
    const body = JSON.parse(String(cap.body)) as {
      tools?: Array<{ functionDeclarations?: Array<{ name: string }> }>
    }
    expect(body.tools?.[0]?.functionDeclarations?.[0]?.name).toBe('lookup')
  })
})
