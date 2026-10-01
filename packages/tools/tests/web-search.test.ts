import { describe, it, expect, vi } from 'vitest'
import { createServer } from 'node:http'
import { webSearch } from '../src/web-search'

describe('webSearch', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = webSearch()
    expect(tool.name).toBe('web_search')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.tags).toContain('search')
    expect(tool.category).toBe('retrieval')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('returns error for empty query', async () => {
    const tool = webSearch()
    const result = await tool.execute!({ query: '' }, { messages: [], call: { id: '1', name: 'web_search', args: {}, status: 'running' } })
    expect(result).toContain('Error')
  })

  it('uses custom search function when provided', async () => {
    const customSearch = vi.fn().mockResolvedValue([
      { title: 'Test Result', url: 'https://example.com', snippet: 'A test snippet' },
    ])

    const tool = webSearch({ search: customSearch })
    const result = await tool.execute!(
      { query: 'test' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'test' }, status: 'running' } },
    )

    expect(customSearch).toHaveBeenCalledWith('test')
    expect(result).toContain('Test Result')
    expect(result).toContain('https://example.com')
    expect(result).toContain('A test snippet')
  })

  it('formats multiple results with numbering', async () => {
    const tool = webSearch({
      search: async () => [
        { title: 'First', url: 'https://a.com', snippet: 'Snippet A' },
        { title: 'Second', url: 'https://b.com', snippet: 'Snippet B' },
      ],
    })

    const result = await tool.execute!(
      { query: 'test' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'test' }, status: 'running' } },
    ) as string

    expect(result).toContain('[1]')
    expect(result).toContain('[2]')
    expect(result).toContain('First')
    expect(result).toContain('Second')
  })

  it('returns no results message when empty', async () => {
    const tool = webSearch({ search: async () => [] })
    const result = await tool.execute!(
      { query: 'nothing' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'nothing' }, status: 'running' } },
    )
    expect(result).toContain('No results')
  })

  it('bounds a custom provider by the overall timeout', async () => {
    vi.useFakeTimers()
    try {
      const tool = webSearch({ timeoutMs: 5, search: async () => await new Promise(() => {}) })
      const pending = tool.execute!(
        { query: 'slow' },
        { messages: [], call: { id: '1', name: 'web_search', args: { query: 'slow' }, status: 'running' } },
      )
      const result = expect(pending).rejects.toThrow(/timed out/)
      await vi.advanceTimersByTimeAsync(5)
      await result
    } finally {
      vi.useRealTimers()
    }
  })

  it('caps built-in provider response bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('x'.repeat(100), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const tool = webSearch({ provider: 'serper', apiKey: 'k', maxResponseBytes: 10 })
    const result = await tool.execute!(
      { query: 'large' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'large' }, status: 'running' } },
    )
    expect(result).toContain('maxResponseBytes')
    vi.unstubAllGlobals()
  })

  it('returns error when serper provider has no apiKey', async () => {
    const tool = webSearch({ provider: 'serper' })
    const result = await tool.execute!(
      { query: 'test' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'test' }, status: 'running' } },
    )
    expect(result).toContain('Error')
    expect(result).toContain('apiKey')
  })

  it('returns error when tavily provider has no apiKey', async () => {
    const tool = webSearch({ provider: 'tavily' })
    const result = await tool.execute!(
      { query: 'test' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'test' }, status: 'running' } },
    )
    expect(result).toContain('Error')
    expect(result).toContain('apiKey')
  })

  it('calls Serper endpoint with apiKey and maps organic results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        organic: [
          { title: 'Serper Result', link: 'https://serper.example', snippet: 'serper snippet' },
        ],
      })))
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch({ provider: 'serper', apiKey: 'k', maxResults: 3 })
    const result = await tool.execute!(
      { query: 'hello' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'hello' }, status: 'running' } },
    ) as string

    expect(fetchMock).toHaveBeenCalledWith(
      'https://google.serper.dev/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-KEY': 'k' }),
      }),
    )
    expect(result).toContain('Serper Result')
    expect(result).toContain('https://serper.example')
    vi.unstubAllGlobals()
  })

  it('calls Tavily endpoint with apiKey and maps results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        results: [{ title: 'T', url: 'https://t.example', content: 'body' }],
      })))
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch({ provider: 'tavily', apiKey: 'tk' })
    const result = await tool.execute!(
      { query: 'q' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'q' }, status: 'running' } },
    ) as string

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      expect.any(Object),
    )
    expect(result).toContain('https://t.example')
    vi.unstubAllGlobals()
  })

  it('fetches a URL directly when the query is a URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('<html><head><title>My Page</title></head><body><p>Hello world</p></body></html>'),
    )
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch()
    const result = await tool.execute!(
      { query: 'https://93.184.216.34/doc' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'https://93.184.216.34/doc' }, status: 'running' } },
    ) as string

    expect(fetchMock).toHaveBeenCalledWith(
      'https://93.184.216.34/doc',
      expect.any(Object),
    )
    expect(result).toContain('My Page')
    expect(result).toContain('Hello world')
    vi.unstubAllGlobals()
  })

  it('blocks direct-URL mode for loopback and never calls fetch (SSRF)', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch()
    const result = await tool.execute!(
      { query: 'http://127.0.0.1/' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'http://127.0.0.1/' }, status: 'running' } },
    ) as string

    expect(result).toMatch(/SSRF blocked|private\/loopback|private host/i)
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('falls back to DuckDuckGo HTML when no key is configured', async () => {
    const html = `
      <div class="results">
        <a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com">First Title</a>
        <a class="result__snippet">First snippet body</a>
      </div>
    `
    const fetchMock = vi.fn().mockResolvedValue(new Response(html))
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch()
    const result = await tool.execute!(
      { query: 'AgentsKit' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'AgentsKit' }, status: 'running' } },
    ) as string

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('html.duckduckgo.com'),
      expect.any(Object),
    )
    expect(result).toContain('First Title')
    expect(result).toContain('https://example.com')
    vi.unstubAllGlobals()
  })

  it('prefers Serper backend when SERPER_API_KEY is present in auto mode', async () => {
    process.env.SERPER_API_KEY = 'env-key'
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
        organic: [{ title: 'From Serper', link: 'https://s.example', snippet: 'snip' }],
      })))
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch()
    const result = await tool.execute!(
      { query: 'what' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'what' }, status: 'running' } },
    ) as string

    expect(fetchMock).toHaveBeenCalledWith(
      'https://google.serper.dev/search',
      expect.any(Object),
    )
    expect(result).toContain('From Serper')
    delete process.env.SERPER_API_KEY
    vi.unstubAllGlobals()
  })

  it('reads bounded streamed provider bodies from local HTTP and cancels overflow', async () => {
    let port = 0
    let path = '/small'
    let largeCancelled = false
    let resolveLargeClose: () => void = () => {}
    const largeClosed = new Promise<void>(resolve => { resolveLargeClose = resolve })
    const server = createServer((request, response) => {
      response.setHeader('content-type', 'application/json')
      if (request.url === '/large') {
        let fallback: ReturnType<typeof setTimeout> | undefined
        response.once('close', () => {
          largeCancelled = !response.writableEnded
          if (fallback) clearTimeout(fallback)
          resolveLargeClose()
        })
        response.write(JSON.stringify({
          organic: [{ title: 'x'.repeat(256), link: 'https://local.test', snippet: 'large' }],
        }))
        fallback = setTimeout(() => response.end(), 1_000)
        return
      }
      response.end(JSON.stringify({
        organic: [{ title: 'Local result', link: 'https://local.test', snippet: 'small' }],
      }))
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('expected an IPv4 listen address')
    port = address.port
    const baseUrl = `http://127.0.0.1:${port}`
    const nativeFetch = globalThis.fetch.bind(globalThis)
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => nativeFetch(`${baseUrl}${path}`, init))
    vi.stubGlobal('fetch', fetchMock)

    try {
      const normal = webSearch({ provider: 'serper', apiKey: 'test', maxResponseBytes: 512 })
      const normalResult = await normal.execute!(
        { query: 'small' },
        { messages: [], call: { id: '1', name: 'web_search', args: { query: 'small' }, status: 'running' } },
      ) as string
      expect(normalResult).toContain('Local result')
      expect(fetchMock).toHaveBeenCalledWith('https://google.serper.dev/search', expect.any(Object))

      path = '/large'
      const bounded = webSearch({ provider: 'serper', apiKey: 'test', maxResponseBytes: 64 })
      const boundedResult = await bounded.execute!(
        { query: 'large' },
        { messages: [], call: { id: '2', name: 'web_search', args: { query: 'large' }, status: 'running' } },
      ) as string
      expect(boundedResult).toContain('Error: search response exceeds maxResponseBytes (64)')
      await largeClosed
      expect(largeCancelled).toBe(true)
    } finally {
      vi.unstubAllGlobals()
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
