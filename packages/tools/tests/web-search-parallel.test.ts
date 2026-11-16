import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRuntime } from '@agentskit/runtime'
import type { AdapterFactory, StreamChunk } from '@agentskit/core'
import { webSearch } from '../src/web-search'
import type { McpClient } from '../src/mcp/client'

const ctx = (query: string) => ({ messages: [], call: { id: '1', name: 'web_search', args: { query }, status: 'running' as const } })

function mcpReply(results: unknown[], init: { isError?: boolean } = {}): Response {
  const text = JSON.stringify({ results })
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text }], ...init } }),
    { headers: { 'content-type': 'application/json' } },
  )
}

function sequentialAdapter(calls: StreamChunk[][]): AdapterFactory {
  let i = 0
  return {
    createSource: () => {
      const chunks = calls[i++] ?? [{ type: 'text', content: 'done' }, { type: 'done' }]
      return { stream: async function* () { for (const c of chunks) yield c }, abort: () => {} }
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('webSearch provider parallel', () => {
  it('calls Parallel Search MCP keylessly and formats results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mcpReply([
      { url: 'https://a.example', title: 'A', excerpts: ['one\n two', 'three'] },
      { url: 'https://b.example', title: 'B', excerpts: [] },
    ]))
    vi.stubGlobal('fetch', fetchMock)
    const out = await webSearch({ provider: 'parallel' }).execute!({ query: 'agent kit' }, ctx('agent kit'))
    expect(out).toBe('[1] A\nhttps://a.example\none two three\n\n[2] B\nhttps://b.example\n')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://search.parallel.ai/mcp')
    expect(init.headers).not.toHaveProperty('Authorization')
    const body = JSON.parse(init.body)
    expect(body.method).toBe('tools/call')
    expect(body.params.name).toBe('web_search')
    expect(body.params.arguments).toMatchObject({ objective: 'agent kit', search_queries: ['agent kit'] })
  })

  it('parses SSE responses', async () => {
    const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify({ results: [{ url: 'https://s.example', title: 'S', excerpts: ['x'] }] }) }] } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`event: message\ndata: ${payload}\n\n`, { headers: { 'content-type': 'text/event-stream' } })))
    const out = await webSearch({ provider: 'parallel' }).execute!({ query: 'q' }, ctx('q'))
    expect(out).toContain('https://s.example')
  })

  it('limits results to maxResults', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mcpReply(Array.from({ length: 5 }, (_, i) => ({ url: `https://${i}.example`, title: `T${i}`, excerpts: ['s'] })))))
    const out = await webSearch({ provider: 'parallel', maxResults: 2 }).execute!({ query: 'q' }, ctx('q')) as string
    expect(out).toContain('[2]')
    expect(out).not.toContain('[3]')
  })

  it('returns no-results text for an empty result list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mcpReply([])))
    expect(await webSearch({ provider: 'parallel' }).execute!({ query: 'q' }, ctx('q'))).toBe('No results found for "q"')
  })

  it('surfaces HTTP, MCP, tool, and parse failures', async () => {
    const tool = webSearch({ provider: 'parallel' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 503 })))
    await expect(tool.execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('Parallel Search MCP error: 503')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'boom' } }))))
    await expect(tool.execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('boom')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mcpReply([], { isError: true })))
    await expect(tool.execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('Parallel Search MCP error')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json')))
    await expect(tool.execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('invalid response')
  })

  it('times out and aborts the request', async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => {
      signal = init.signal as AbortSignal
      return new Promise<Response>((_, reject) => signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))
    }))
    await expect(webSearch({ provider: 'parallel', timeoutMs: 20 }).execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('timed out after 20ms')
    expect(signal?.aborted).toBe(true)
  })

  it('honours caller cancellation', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    })))
    const pending = webSearch({ provider: 'parallel', signal: controller.signal }).execute!({ query: 'q' }, ctx('q'))
    controller.abort()
    await expect(pending).rejects.toThrow(/abort|timed out/)
    const already = new AbortController()
    already.abort()
    await expect(webSearch({ provider: 'parallel', signal: already.signal, mcpClient: { callTool: () => new Promise(() => {}) } as unknown as McpClient }).execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('aborted')
  })

  it('enforces maxResponseBytes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mcpReply([{ url: 'https://a.example', title: 'A', excerpts: ['x'.repeat(500)] }])))
    await expect(webSearch({ provider: 'parallel', maxResponseBytes: 100 }).execute!({ query: 'q' }, ctx('q'))).rejects.toThrow('maxResponseBytes')
  })

  it('uses a host-owned MCP client without the default transport', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const callTool = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify({ results: [{ url: 'https://h.example', title: 'H', excerpts: ['hosted'] }] }) }] })
    const out = await webSearch({ provider: 'parallel', mcpClient: { callTool } as unknown as McpClient }).execute!({ query: 'q' }, ctx('q'))
    expect(out).toContain('hosted')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps URL queries on the direct-fetch path, falling back to Parallel when empty', async () => {
    const fetchMock = vi.fn(async (url: string) => url.includes('search.parallel.ai') ? mcpReply([{ url: 'https://p.example', title: 'P', excerpts: ['via parallel'] }]) : new Response('<title>Direct</title>hello', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const direct = await webSearch({ provider: 'parallel' }).execute!({ query: 'https://93.184.216.34/page' }, ctx('u'))
    expect(direct).toContain('Direct')
    expect(fetchMock.mock.calls.some(c => String(c[0]).includes('parallel.ai'))).toBe(false)
  })

  it('does not change auto selection and keeps custom search precedence', async () => {
    vi.stubEnv('SERPER_API_KEY', '')
    vi.stubEnv('TAVILY_API_KEY', '')
    const fetchMock = vi.fn().mockResolvedValue(new Response('<html></html>'))
    vi.stubGlobal('fetch', fetchMock)
    await webSearch().execute!({ query: 'q' }, ctx('q'))
    expect(String(fetchMock.mock.calls[0][0])).toContain('duckduckgo')
    const search = vi.fn().mockResolvedValue([{ title: 'C', url: 'https://c.example', snippet: 's' }])
    await webSearch({ provider: 'parallel', search }).execute!({ query: 'q' }, ctx('q'))
    expect(search).toHaveBeenCalledWith('q')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('is consumed through createRuntime', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mcpReply([{ url: 'https://r.example', title: 'R', excerpts: ['runtime snippet'] }])))
    const runtime = createRuntime({
      adapter: sequentialAdapter([
        [{ type: 'tool_call', toolCall: { id: 'c1', name: 'web_search', args: '{"query":"agentskit"}' } }, { type: 'done' }],
        [{ type: 'text', content: 'ok' }, { type: 'done' }],
      ]),
      tools: [webSearch({ provider: 'parallel' })],
    })
    const result = await runtime.run('find it')
    expect(result.toolCalls[0].result).toContain('runtime snippet')
    expect(result.toolCalls[0].result).toContain('https://r.example')
  })

  it('surfaces a selected Parallel failure through createRuntime tool call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('no', { status: 500 })))
    const runtime = createRuntime({
      adapter: sequentialAdapter([
        [{ type: 'tool_call', toolCall: { id: 'c1', name: 'web_search', args: '{"query":"x"}' } }, { type: 'done' }],
        [{ type: 'text', content: 'ok' }, { type: 'done' }],
      ]),
      tools: [webSearch({ provider: 'parallel' })],
    })
    const result = await runtime.run('find it')
    expect(result.toolCalls[0].status).toBe('error')
    expect(result.toolCalls[0].error).toContain('Parallel Search MCP error: 500')
  })
})
