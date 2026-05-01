import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cohere, cohereAdapter } from '../src/cohere'

interface Capture {
  url?: string
  body?: unknown
  authorization?: string
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
    cap.url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    cap.body = init?.body
    const headers = init?.headers as Record<string, string> | undefined
    cap.authorization = headers?.authorization ?? headers?.Authorization
    throw new Error('stub')
  }) as typeof globalThis.fetch
}

async function drain(factory: ReturnType<typeof cohere>, body?: unknown): Promise<void> {
  const source = factory.createSource({
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
    context: body as never,
  })
  const iter = source.stream()[Symbol.asyncIterator]()
  try {
    while (!(await iter.next()).done) {
      // drain
    }
  } catch {
    // expected — fetch stub rejects
  }
}

describe('cohereAdapter', () => {
  it('declares capabilities (streaming, tools, usage)', () => {
    const factory = cohere({ apiKey: 'k' })
    expect(factory.capabilities).toEqual({ streaming: true, tools: true, usage: true })
  })

  it('exports as cohereAdapter alias', () => {
    expect(cohereAdapter).toBe(cohere)
  })

  it('targets the cohere compatibility endpoint by default', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(cohere({ apiKey: 'k' }))
    expect(cap.url).toContain('https://api.cohere.com/compatibility/v1')
  })

  it('defaults to command-r-plus when no model is given', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(cohere({ apiKey: 'k' }))
    const body = JSON.parse(String(cap.body)) as { model: string }
    expect(body.model).toBe('command-r-plus')
  })

  it('honours explicit model override', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(cohere({ apiKey: 'k', model: 'command-r' }))
    const body = JSON.parse(String(cap.body)) as { model: string }
    expect(body.model).toBe('command-r')
  })

  it('passes the API key as a Bearer token', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(cohere({ apiKey: 'sk-cohere-test' }))
    expect(cap.authorization).toBe('Bearer sk-cohere-test')
  })

  it('streams (request payload sets stream: true)', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(cohere({ apiKey: 'k' }))
    const body = JSON.parse(String(cap.body)) as { stream: boolean }
    expect(body.stream).toBe(true)
  })

  it('forwards tools in the OpenAI tools schema', async () => {
    const cap: Capture = {}
    mockFetch(cap)
    await drain(cohere({ apiKey: 'k' }), {
      tools: [{ name: 'lookup', description: 'lookup user', schema: { type: 'object' } }],
    })
    const body = JSON.parse(String(cap.body)) as {
      tools: Array<{ type: string; function: { name: string } }>
    }
    expect(body.tools).toHaveLength(1)
    expect(body.tools[0].type).toBe('function')
    expect(body.tools[0].function.name).toBe('lookup')
  })
})
