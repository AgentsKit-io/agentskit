import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { replicate, replicateAdapter } from '../src/replicate'
import type { StreamChunk } from '@agentskit/core'

const STREAM_URL = 'https://stream.replicate.com/predictions/abc123'

let originalFetch: typeof globalThis.fetch
beforeEach(() => { originalFetch = globalThis.fetch })
afterEach(() => { globalThis.fetch = originalFetch })

function mockFetchSequence(responses: Array<(url: string, init: RequestInit) => Response>): {
  calls: Array<{ url: string; init: RequestInit }>
} {
  const calls: Array<{ url: string; init: RequestInit }> = []
  let i = 0
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    calls.push({ url, init: init ?? {} })
    return responses[i++](url, init ?? {})
  }) as typeof globalThis.fetch
  return { calls }
}

function sseStream(events: Array<{ event: string; data: string }>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(c) {
      for (const e of events) c.enqueue(encoder.encode(`event: ${e.event}\ndata: ${e.data}\n\n`))
      c.close()
    },
  })
}

async function collect(factory: ReturnType<typeof replicate>): Promise<StreamChunk[]> {
  const out: StreamChunk[] = []
  for await (const chunk of factory.createSource({
    messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
  }).stream()) {
    out.push(chunk)
  }
  return out
}

describe('replicateAdapter', () => {
  it('declares capabilities', () => {
    const factory = replicate({ apiKey: 'k', model: 'meta/meta-llama-3-70b-instruct' })
    expect(factory.capabilities).toEqual({ streaming: true, tools: false })
  })

  it('exports as replicateAdapter alias', () => {
    expect(replicateAdapter).toBe(replicate)
  })

  it('POSTs to model-specific predictions endpoint by default', async () => {
    const { calls } = mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([{ event: 'done', data: '' }]), { status: 200 }),
    ])
    await collect(replicate({ apiKey: 'k', model: 'meta/meta-llama-3-70b-instruct' }))
    expect(calls[0].url).toBe('https://api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions')
    expect(calls[1].url).toBe(STREAM_URL)
  })

  it('uses /v1/predictions when version is set', async () => {
    const { calls } = mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([{ event: 'done', data: '' }]), { status: 200 }),
    ])
    await collect(replicate({ apiKey: 'k', model: 'meta/meta-llama-3-70b-instruct', version: 'abc123' }))
    expect(calls[0].url).toBe('https://api.replicate.com/v1/predictions')
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({ version: 'abc123', stream: true })
  })

  it('passes API key as Bearer', async () => {
    const { calls } = mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([{ event: 'done', data: '' }]), { status: 200 }),
    ])
    await collect(replicate({ apiKey: 'r8_test', model: 'm/m' }))
    const auth = (calls[0].init.headers as Record<string, string>).Authorization
    expect(auth).toBe('Bearer r8_test')
  })

  it('streams output events as text and ends on done', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([
        { event: 'output', data: 'Hel' },
        { event: 'output', data: 'lo' },
        { event: 'done', data: '' },
      ]), { status: 200 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    const texts = out.filter(c => c.type === 'text').map(c => (c as { content: string }).content)
    expect(texts).toEqual(['Hel', 'lo'])
    expect(out.find(c => c.type === 'done')).toBeDefined()
  })

  it('surfaces error events', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([{ event: 'error', data: 'rate limit' }]), { status: 200 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    const err = out.find(c => c.type === 'error') as { content: string } | undefined
    expect(err?.content).toContain('rate limit')
  })

  it('ends without done event as terminal error, not done', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([
        { event: 'output', data: 'partial' },
        // stream closes without a `done` event
      ]), { status: 200 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    expect(out.some(c => c.type === 'text')).toBe(true)
    expect(out.at(-1)?.type).toBe('error')
    expect(out.at(-1)?.metadata?.error).toBeInstanceOf(Error)
    expect(out.some(c => c.type === 'done')).toBe(false)
  })

  it('errors when prediction returns no stream URL', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1' }), { status: 201 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    expect((out[0] as { content: string }).content).toContain('no stream URL')
  })

  it('errors when prediction POST is non-2xx', async () => {
    mockFetchSequence([
      () => new Response('boom', { status: 500 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    expect((out[0] as { content: string }).content).toContain('500')
  })

  it('surfaces prediction.error field from the create response', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', error: 'invalid input' }), { status: 201 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    expect((out[0] as { content: string }).content).toBe('invalid input')
  })

  it('errors when the stream fetch itself fails', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response('boom', { status: 502 }),
    ])
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    expect((out[0] as { content: string }).content).toContain('502')
  })

  it('default prompt builder includes system + assistant turns', async () => {
    const { calls } = mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([{ event: 'done', data: '' }]), { status: 200 }),
    ])
    const factory = replicate({ apiKey: 'k', model: 'm/m' })
    const src = factory.createSource({
      messages: [
        { id: '1', role: 'system', content: 'sys', status: 'complete', createdAt: new Date(0) },
        { id: '2', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) },
        { id: '3', role: 'assistant', content: 'ok', status: 'complete', createdAt: new Date(0) },
        { id: '4', role: 'user', content: 'again', status: 'complete', createdAt: new Date(0) },
      ],
    })
    for await (const _ of src.stream()) {/* drain */}
    const body = JSON.parse(String(calls[0].init.body)) as { input: { prompt: string } }
    expect(body.input.prompt).toContain('[SYSTEM] sys')
    expect(body.input.prompt).toContain('[ASSISTANT] ok')
    expect(body.input.prompt).toMatch(/\[ASSISTANT\] $/)
  })

  it('aborts mid-stream without yielding more chunks', async () => {
    mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([
        { event: 'output', data: 'one' },
        { event: 'output', data: 'two' },
        { event: 'done', data: '' },
      ]), { status: 200 }),
    ])
    const factory = replicate({ apiKey: 'k', model: 'm/m' })
    const source = factory.createSource({
      messages: [{ id: '1', role: 'user', content: 'hi', status: 'complete', createdAt: new Date(0) }],
    })
    const iter = source.stream()
    const first = await iter.next()
    expect(first.value).toMatchObject({ type: 'text', content: 'one' })
    source.abort()
    // drain remaining; should terminate quickly
    while (!(await iter.next()).done) {/* nothing */}
  })

  it('returns silently when fetch is aborted (AbortError)', async () => {
    globalThis.fetch = vi.fn(async () => {
      const e = new DOMException('aborted', 'AbortError')
      throw e
    }) as typeof globalThis.fetch
    const out = await collect(replicate({ apiKey: 'k', model: 'm/m' }))
    expect(out).toEqual([])
  })

  it('honours custom toInput', async () => {
    const { calls } = mockFetchSequence([
      () => new Response(JSON.stringify({ id: 'p1', urls: { stream: STREAM_URL } }), { status: 201 }),
      () => new Response(sseStream([{ event: 'done', data: '' }]), { status: 200 }),
    ])
    await collect(replicate({
      apiKey: 'k',
      model: 'm/m',
      toInput: () => ({ prompt: 'CUSTOM', max_tokens: 100 }),
    }))
    const body = JSON.parse(String(calls[0].init.body)) as { input: { prompt: string; max_tokens: number } }
    expect(body.input).toEqual({ prompt: 'CUSTOM', max_tokens: 100 })
  })
})
