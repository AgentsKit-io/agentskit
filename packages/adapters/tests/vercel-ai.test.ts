import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'
import { vercelAI } from '../src/vercel-ai'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

const request: AdapterRequest = {
  messages: [
    { id: '1', role: 'user', content: 'hello', status: 'complete', createdAt: new Date() },
  ],
  tools: [],
}

function mockBody(text: string): typeof globalThis.fetch {
  return vi.fn(async (_url: unknown, _init?: RequestInit) => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      },
    })
    return new Response(stream, { status: 200 })
  }) as unknown as typeof globalThis.fetch
}

async function drain(adapter: ReturnType<typeof vercelAI>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const c of adapter.createSource(request).stream()) out.push(c)
  return out
}

describe('vercelAI adapter', () => {
  it('streams body chunks as text and ends with done', async () => {
    globalThis.fetch = mockBody('hello world')
    const adapter = vercelAI({ api: 'https://example/api' })
    const chunks = await drain(adapter)
    const text = chunks.filter(c => c.type === 'text').map(c => (c as { content: string }).content).join('')
    expect(text).toBe('hello world')
    expect(chunks.at(-1)?.type).toBe('done')
  })

  it('forwards configured headers', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init })
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode('ok'))
          c.close()
        },
      })
      return new Response(stream, { status: 200 })
    }) as unknown as typeof globalThis.fetch
    const adapter = vercelAI({ api: 'https://x/api', headers: { 'x-token': 'secret' } })
    await drain(adapter)
    const headers = calls[0]!.init?.headers as Record<string, string>
    expect(headers['x-token']).toBe('secret')
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('serialises the messages + tools + systemPrompt body', async () => {
    const calls: Array<{ body?: string }> = []
    globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls.push({ body: init?.body as string })
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new TextEncoder().encode(''))
          c.close()
        },
      })
      return new Response(stream, { status: 200 })
    }) as unknown as typeof globalThis.fetch
    const adapter = vercelAI({ api: 'https://x/api' })
    const reqWithCtx: AdapterRequest = {
      ...request,
      context: { tools: [{ name: 't', description: 'd', schema: { type: 'object' } }], systemPrompt: 'sys' },
    } as never
    for await (const _ of adapter.createSource(reqWithCtx).stream()) void _
    const body = JSON.parse(calls[0]!.body!) as { systemPrompt: string; tools: unknown[] }
    expect(body.systemPrompt).toBe('sys')
    expect(body.tools).toHaveLength(1)
  })

  it('declares empty capabilities by default', () => {
    const adapter = vercelAI({ api: 'https://x' })
    expect(adapter.capabilities).toEqual({})
  })
})
