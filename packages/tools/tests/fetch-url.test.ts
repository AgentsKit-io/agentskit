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

  describe('SSRF guard', () => {
    it('blocks IPv4 loopback', async () => {
      const tool = fetchUrl()
      const result = await tool.execute!({ url: 'http://127.0.0.1/' }, ctx) as string
      expect(result).toMatch(/SSRF blocked|private\/loopback/)
    })

    it('blocks AWS IMDS link-local 169.254.169.254', async () => {
      const tool = fetchUrl()
      const result = await tool.execute!({ url: 'http://169.254.169.254/latest/meta-data/' }, ctx) as string
      expect(result).toMatch(/SSRF blocked|private\/loopback/)
    })

    it('blocks GCP metadata host', async () => {
      const tool = fetchUrl()
      const result = await tool.execute!({ url: 'http://metadata.google.internal/' }, ctx) as string
      expect(result).toMatch(/SSRF blocked|private\/loopback/)
    })

    it('blocks RFC1918 ranges (10.x, 172.16.x, 192.168.x)', async () => {
      const tool = fetchUrl()
      for (const host of ['10.0.0.1', '172.16.0.1', '192.168.1.1']) {
        const result = await tool.execute!({ url: `http://${host}/` }, ctx) as string
        expect(result).toMatch(/SSRF blocked|private\/loopback/)
      }
    })

    it('blocks localhost hostname', async () => {
      const tool = fetchUrl()
      const result = await tool.execute!({ url: 'http://localhost:8080/' }, ctx) as string
      expect(result).toMatch(/SSRF blocked|private\/loopback/)
    })

    it('blocks IPv6 loopback ::1', async () => {
      const tool = fetchUrl()
      const result = await tool.execute!({ url: 'http://[::1]/' }, ctx) as string
      expect(result).toMatch(/SSRF blocked|private\/loopback/)
    })

    it('allows private host when allowPrivateHosts:true', async () => {
      const body = new TextEncoder().encode('hi')
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse(body, 'text/plain')))
      const tool = fetchUrl({ allowPrivateHosts: true })
      const result = await tool.execute!({ url: 'http://127.0.0.1/health' }, ctx) as string
      expect(result).toContain('hi')
    })

    it('rejects host not in allowedHosts even when public', async () => {
      const tool = fetchUrl({ allowedHosts: ['api.example.com'] })
      const result = await tool.execute!({ url: 'https://evil.com/' }, ctx) as string
      expect(result).toMatch(/not in allowedHosts/)
    })

    it('blocks redirect-based SSRF to loopback', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 302,
          statusText: 'Found',
          headers: new Map([['location', 'http://127.0.0.1/admin']]),
          body: null,
        })
      vi.stubGlobal('fetch', fetchMock)
      const tool = fetchUrl()
      const result = await tool.execute!({ url: 'https://example.com/redir' }, ctx) as string
      expect(result).toMatch(/SSRF blocked|private\/loopback/)
    })

    it('caps redirects at maxRedirects', async () => {
      let n = 0
      vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
        n++
        return Promise.resolve({
          ok: false,
          status: 302,
          statusText: 'Found',
          headers: new Map([['location', `https://example.com/next${n}`]]),
          body: null,
        })
      }))
      const tool = fetchUrl({ maxRedirects: 2 })
      const result = await tool.execute!({ url: 'https://example.com/0' }, ctx) as string
      expect(result).toMatch(/exceeded maxRedirects/)
    })
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
