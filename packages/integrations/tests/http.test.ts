import { describe, it, expect } from 'vitest'
import { httpJson, bindHttp } from '../src/http'

function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {})) as typeof globalThis.fetch
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('httpJson', () => {
  it('GETs against baseUrl and parses JSON', async () => {
    let seenUrl = ''
    let seenMethod = ''
    const fetch = fakeFetch((url, init) => {
      seenUrl = url
      seenMethod = String(init.method)
      return jsonResponse({ ok: true, value: 42 })
    })
    const result = await httpJson<{ value: number }>(
      { baseUrl: 'https://api.example.com', headers: { authorization: 'Bearer x' }, fetch },
      { path: '/things', query: { limit: 10, skip: undefined } },
    )
    expect(result.value).toBe(42)
    expect(seenUrl).toBe('https://api.example.com/things?limit=10')
    expect(seenMethod).toBe('GET')
  })

  it('serializes a JSON body on POST', async () => {
    let seenBody = ''
    const fetch = fakeFetch((_url, init) => {
      seenBody = String(init.body)
      return jsonResponse({ created: true })
    })
    await httpJson({ baseUrl: 'https://api.example.com', fetch }, {
      method: 'POST',
      path: '/things',
      body: { name: 'x' },
    })
    expect(JSON.parse(seenBody)).toEqual({ name: 'x' })
  })

  it('uses an absolute path when no baseUrl is set', async () => {
    let seenUrl = ''
    const fetch = fakeFetch((url) => {
      seenUrl = url
      return jsonResponse({ ok: true })
    })
    await httpJson({ fetch }, { path: 'https://other.example.com/x' })
    expect(seenUrl).toBe('https://other.example.com/x')
  })

  it('returns raw text for non-JSON content-type', async () => {
    const fetch = fakeFetch(() => new Response('plain', { status: 200, headers: { 'content-type': 'text/plain' } }))
    const result = await httpJson({ baseUrl: 'https://api.example.com', fetch }, { path: '/x' })
    expect(result).toBe('plain')
  })

  it('throws on non-2xx with the server body attached', async () => {
    const fetch = fakeFetch(() => new Response('nope', { status: 404, statusText: 'Not Found' }))
    await expect(
      httpJson({ baseUrl: 'https://api.example.com', fetch }, { path: '/missing' }),
    ).rejects.toThrow(/HTTP 404/)
  })

  it('throws when a JSON content-type body is unparseable', async () => {
    const fetch = fakeFetch(() => new Response('{bad', { status: 200, headers: { 'content-type': 'application/json' } }))
    await expect(
      httpJson({ baseUrl: 'https://api.example.com', fetch }, { path: '/x' }),
    ).rejects.toThrow(/Invalid JSON/)
  })

})

describe('bindHttp', () => {
  it('binds options into a reusable client', async () => {
    const fetch = fakeFetch(() => jsonResponse({ pong: true }))
    const http = bindHttp({ baseUrl: 'https://api.example.com', fetch })
    const result = await http<{ pong: boolean }>({ path: '/ping' })
    expect(result.pong).toBe(true)
  })
})
