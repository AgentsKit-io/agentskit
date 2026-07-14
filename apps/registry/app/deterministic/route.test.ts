import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './[file]/route'

const request = (file: string) => GET(
  new Request(`https://registry.example/deterministic/${file}`),
  { params: Promise.resolve({ file }) },
)

describe('Registry deterministic proxy', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('only caches successful artifacts and real not-found responses', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('{"ok":true}'))
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const success = await request('site-config.json')
    expect(success.status).toBe(200)
    expect(success.headers.get('cache-control')).toContain('s-maxage=3600')

    const missing = await request('knowledge.json')
    expect(missing.status).toBe(404)
    expect(missing.headers.get('cache-control')).toContain('s-maxage=3600')
  })

  it('turns transient upstream failures into retryable, non-cacheable responses', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 429, headers: { 'retry-after': '12' } }),
    ))

    const response = await request('knowledge.json')
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('retry-after')).toBe('12')
  })
})
