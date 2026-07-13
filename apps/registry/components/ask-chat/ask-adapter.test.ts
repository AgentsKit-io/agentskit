import { decodeAssistantContent } from '@agentskit/chat-protocol'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAskAdapter, createAskSessionMemory, decodeAskEvents, projectAskEvent } from './ask-adapter'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('Registry Ask AgentsKit Chat adapter', () => {
  it('validates wire records and leaves malformed or unknown events inert', () => {
    const decoded = decodeAskEvents(`${JSON.stringify({ type: 'text', delta: 'hello' })}\nnot-json\n${JSON.stringify({ type: 'tool', id: 'x', name: 'unknown', args: {} })}\n`)
    expect(decoded.events).toHaveLength(2)
    expect(projectAskEvent(decoded.events[1]!)).toBeUndefined()
  })

  it('bounds citations and rejects unsafe links', () => {
    const projected = projectAskEvent({ type: 'tool', id: 'source id', name: 'cite', args: { sources: [
      { title: 'Docs Chat', path: '/agents/docs-chat' },
      { title: 'unsafe', path: 'javascript:alert(1)' },
      { title: 'x'.repeat(2_000), path: 'https://example.com/agent' },
    ] } })
    expect(projected?.kind).toBe('component')
    if (projected?.kind !== 'component') return
    expect(projected.frame.instanceId).toBe('source-id')
    expect(projected.frame.props).toMatchObject({ sources: [{ title: 'Docs Chat', url: '/agents/docs-chat' }, { url: 'https://example.com/agent' }] })
    expect(projected.frame.fallback.summary.length).toBeLessThanOrEqual(4_096)
  })

  it('streams grounded text and source-list in one canonical message', async () => {
    const body = [
      JSON.stringify({ type: 'text', delta: 'Use the agent.' }),
      JSON.stringify({ type: 'tool', id: 'sources', name: 'cite', args: { sources: [{ title: 'Agent', path: '/agents/docs-chat' }] } }),
      JSON.stringify({ type: 'done', model: 'test' }), '',
    ].join('\n')
    const fetchMock = vi.fn(async () => new Response(body, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const source = createAskAdapter({ endpoint: '/v1/ask?persona=registry', corpus: 'registry' }).createSource({ messages: [{ id: 'u', role: 'user', content: 'Which?', status: 'complete', createdAt: new Date() }] })
    let content = ''
    for await (const chunk of source.stream()) if (chunk.type === 'text') content += chunk.content ?? ''
    const decoded = decodeAssistantContent(content)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.parts).toMatchObject([{ kind: 'text' }, { kind: 'component', frame: { componentKey: 'source-list' } }])
    expect(fetchMock).toHaveBeenCalledWith('/v1/ask?persona=registry&corpus=registry', expect.objectContaining({ method: 'POST' }))
  })

  it('migrates the legacy Registry role/text record', async () => {
    const values = new Map([['ak:ask-thread:registry', JSON.stringify([{ id: '1', role: 'user', text: 'Find an agent' }, { id: '2', role: 'assistant', text: 'Use docs-chat.' }])]])
    vi.stubGlobal('sessionStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) })
    const memory = createAskSessionMemory({ key: 'ak:ask-thread-v3:registry', legacyKeys: ['ak:ask-thread:registry'] })
    await expect(memory.load()).resolves.toMatchObject([{ role: 'user', content: 'Find an agent' }, { role: 'assistant', content: 'Use docs-chat.' }])
    expect(values.has('ak:ask-thread:registry')).toBe(false)
    expect(values.has('ak:ask-thread-v3:registry')).toBe(true)
  })

  it('propagates stop to the public adapter source', async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn(async (_input: unknown, init?: RequestInit) => { signal = init?.signal ?? undefined; throw new DOMException('aborted', 'AbortError') }))
    const source = createAskAdapter({ corpus: 'registry' }).createSource({ messages: [] })
    source.abort?.()
    const chunks = []
    for await (const chunk of source.stream()) chunks.push(chunk)
    expect(signal?.aborted).toBe(true)
    expect(chunks).toEqual([])
  })
})
