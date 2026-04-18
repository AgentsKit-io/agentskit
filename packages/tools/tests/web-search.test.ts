import { describe, it, expect, vi } from 'vitest'
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [
          { title: 'Serper Result', link: 'https://serper.example', snippet: 'serper snippet' },
        ],
      }),
    })
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ title: 'T', url: 'https://t.example', content: 'body' }],
      }),
    })
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><head><title>My Page</title></head><body><p>Hello world</p></body></html>',
    })
    vi.stubGlobal('fetch', fetchMock)

    const tool = webSearch()
    const result = await tool.execute!(
      { query: 'https://example.com/doc' },
      { messages: [], call: { id: '1', name: 'web_search', args: { query: 'https://example.com/doc' }, status: 'running' } },
    ) as string

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/doc',
      expect.any(Object),
    )
    expect(result).toContain('My Page')
    expect(result).toContain('Hello world')
    vi.unstubAllGlobals()
  })

  it('falls back to DuckDuckGo HTML when no key is configured', async () => {
    const html = `
      <div class="results">
        <a class="result__a" href="/l/?uddg=https%3A%2F%2Fexample.com">First Title</a>
        <a class="result__snippet">First snippet body</a>
      </div>
    `
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => html })
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
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [{ title: 'From Serper', link: 'https://s.example', snippet: 'snip' }],
      }),
    })
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
})
