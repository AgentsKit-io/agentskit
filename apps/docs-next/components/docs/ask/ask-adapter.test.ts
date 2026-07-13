import { createAssistantContentEncoder, decodeAssistantContent } from '@agentskit/chat-protocol'
import { createChatController } from '@agentskit/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAskAdapter, createAskSessionMemory, projectAskEvent } from './ask-adapter'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Docs Ask AgentsKit Chat adapter', () => {
  it('projects deterministic citations into the standard SourceList contract', () => {
    const projected = projectAskEvent({
      type: 'tool',
      id: 'sources',
      name: 'cite',
      args: { sources: [{ title: 'Runtime', path: '/docs/agents/runtime', anchor: 'run' }] },
    })
    expect(projected.part).toMatchObject({
      kind: 'component',
      frame: {
        componentKey: 'source-list',
        instanceId: 'sources',
        props: { label: 'Sources', sources: [{ id: 'source-1', title: 'Runtime', url: '/docs/agents/runtime#run' }] },
      },
    })
  })

  it('keeps unknown tools inert and maps trusted canned answers to text', () => {
    expect(projectAskEvent({ type: 'tool', id: 'bad', name: 'unknown', args: {} })).toEqual({})
    expect(projectAskEvent({ type: 'tool', id: 'answer', name: 'answer', args: { markdown: 'Read the docs.' } })).toEqual({
      part: { kind: 'text', text: 'Read the docs.' },
    })
  })

  it('bounds citation fallback even when a source title is oversized', () => {
    const projected = projectAskEvent({ type: 'tool', id: 'sources', name: 'cite', args: { sources: [{ title: 'x'.repeat(8_000), path: '/docs' }] } })
    expect(projected.part?.kind).toBe('component')
    if (projected.part?.kind === 'component') expect(projected.part.frame.fallback.summary.length).toBeLessThanOrEqual(4_096)
  })

  it('streams grounded text followed by SourceList through one canonical message', async () => {
    const ndjson = [
      JSON.stringify({ type: 'text', delta: 'Grounded answer.' }),
      JSON.stringify({ type: 'tool', id: 'sources', name: 'cite', args: { sources: [{ title: 'RAG', path: '/docs/rag' }] } }),
      JSON.stringify({ type: 'done', model: 'test' }),
      '',
    ].join('\n')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(ndjson, { status: 200 })))
    const source = createAskAdapter({ endpoint: '/api/ask-docs', corpus: 'docs' }).createSource({
      messages: [{ id: 'user', role: 'user', content: 'How?', status: 'complete', createdAt: new Date() }],
    })
    let wire = ''
    for await (const chunk of source.stream()) if (chunk.type === 'text') wire += chunk.content ?? ''
    const decoded = decodeAssistantContent(wire)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.parts).toMatchObject([
      { kind: 'text', text: 'Grounded answer.' },
      { kind: 'component', frame: { componentKey: 'source-list' } },
    ])
    expect(fetch).toHaveBeenCalledWith('/api/ask-docs?corpus=docs', expect.objectContaining({ method: 'POST' }))
  })

  it('projects persisted composite answers back to clean conversational history', async () => {
    let body = ''
    vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init?: RequestInit) => {
      body = String(init?.body ?? '')
      return new Response(`${JSON.stringify({ type: 'done', model: 'test' })}\n`, { status: 200 })
    }))
    const previous = projectAskEvent({ type: 'text', delta: 'Previous answer.' }).part!
    const protocol = createAssistantContentEncoder()
    const source = createAskAdapter({ endpoint: '/api/ask-docs' }).createSource({ messages: [
      { id: 'assistant', role: 'assistant', content: protocol.encode(previous), status: 'complete', createdAt: new Date() },
      { id: 'user', role: 'user', content: 'Follow up', status: 'complete', createdAt: new Date() },
    ] })
    for await (const chunk of source.stream()) void chunk
    expect(JSON.parse(body)).toEqual({ messages: [
      { role: 'assistant', content: 'Previous answer.' },
      { role: 'user', content: 'Follow up' },
    ] })
  })

  it('preserves the legacy plain-text fallback without exposing transport framing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Plain fallback', { status: 200 })))
    const source = createAskAdapter({ endpoint: '/api/ask-docs' }).createSource({ messages: [] })
    let wire = ''
    for await (const chunk of source.stream()) if (chunk.type === 'text') wire += chunk.content ?? ''
    expect(decodeAssistantContent(wire)).toEqual({ ok: true, complete: true, parts: [{ kind: 'text', text: 'Plain fallback' }] })
  })

  it('settles the canonical assistant message when Ask is stopped', async () => {
    let connected: (() => void) | undefined
    const ready = new Promise<void>(resolve => { connected = resolve })
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      connected?.()
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })))
    const chat = createChatController({ adapter: createAskAdapter() })

    const sending = chat.send('stop me')
    await ready
    chat.stop()
    await sending

    expect(chat.getState()).toMatchObject({ status: 'idle', messages: [{ role: 'user' }, { role: 'assistant', status: 'complete' }] })
  })

  it('persists only the latest canonical messages in session storage', async () => {
    const values = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const memory = createAskSessionMemory('ask-test', 1)
    const messages = [
      { id: 'one', role: 'user' as const, content: 'one', status: 'complete' as const, createdAt: new Date() },
      { id: 'two', role: 'assistant' as const, content: 'two', status: 'complete' as const, createdAt: new Date() },
    ]
    await memory.save(messages)
    expect(await memory.load()).toMatchObject([{ id: 'two', content: 'two' }])
    await memory.clear?.()
    expect(await memory.load()).toEqual([])
  })
})
