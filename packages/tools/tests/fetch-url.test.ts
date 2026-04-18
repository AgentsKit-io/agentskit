import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchUrl } from '../src/fetch-url'

const ctx = { messages: [], call: { id: '1', name: 'fetch_url', args: {}, status: 'running' as const } }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchUrl', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = fetchUrl()
    expect(tool.name).toBe('fetch_url')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.tags).toContain('web')
    expect(tool.category).toBe('retrieval')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('returns error when url missing', async () => {
    const tool = fetchUrl()
    const result = await tool.execute!({ url: '' }, ctx)
    expect(result).toContain('Error')
  })

  it('rejects invalid URLs', async () => {
    const tool = fetchUrl()
    const result = await tool.execute!({ url: 'not a url' }, ctx)
    expect(result).toContain('invalid URL')
  })

  it('rejects non-http(s) protocols', async () => {
    const tool = fetchUrl()
    const result = await tool.execute!({ url: 'file:///etc/passwd' }, ctx)
    expect(result).toContain('unsupported protocol')
  })

  it('strips HTML and returns text by default', async () => {
    const html = '<html><body><p>Hello <b>world</b></p><script>alert(1)</script></body></html>'
    const body = new TextEncoder().encode(html)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(body, 'text/html')))

    const tool = fetchUrl()
    const result = await tool.execute!({ url: 'https://example.com' }, ctx) as string

    expect(result).toContain('URL: https://example.com')
    expect(result).toContain('Hello world')
    expect(result).not.toContain('<p>')
    expect(result).not.toContain('alert(1)')
  })

  it('returns raw body when raw flag is true', async () => {
    const body = new TextEncoder().encode('<html><body><p>Hello</p></body></html>')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(body, 'text/html')))

    const tool = fetchUrl()
    const result = await tool.execute!({ url: 'https://example.com', raw: true }, ctx) as string

    expect(result).toContain('<p>Hello</p>')
  })

  it('surfaces non-2xx as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
        body: null,
      }),
    )
    const tool = fetchUrl()
    const result = await tool.execute!({ url: 'https://example.com' }, ctx) as string
    expect(result).toContain('Error')
    expect(result).toContain('404')
  })

  it('truncates bodies above maxBytes', async () => {
    const big = 'A'.repeat(10_000)
    const body = new TextEncoder().encode(big)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(body, 'text/plain')))

    const tool = fetchUrl({ maxBytes: 100 })
    const result = await tool.execute!({ url: 'https://example.com' }, ctx) as string
    expect(result).toContain('[truncated at 100 bytes]')
  })

  it('reports fetch exceptions in a readable form', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')))

    const tool = fetchUrl()
    const result = await tool.execute!({ url: 'https://example.com' }, ctx) as string
    expect(result).toContain('Error fetching')
    expect(result).toContain('boom')
  })
})

function makeResponse(body: Uint8Array, contentType: string) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map([['content-type', contentType]]),
    body: {
      getReader: () => {
        let sent = false
        return {
          async read() {
            if (sent) return { done: true, value: undefined }
            sent = true
            return { done: false, value: body }
          },
          async cancel() {},
        }
      },
    },
  }
}
