import { describe, it, expect } from 'vitest'
import { ErrorCodes, ToolError } from '@agentskit/core'
import { httpJson, bindHttp, type HttpToolOptions } from '../src/http'

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

function headerBag(init: RequestInit): Record<string, string> {
  const raw = init.headers
  if (!raw) return {}
  if (raw instanceof Headers) {
    const out: Record<string, string> = {}
    raw.forEach((value, key) => {
      out[key.toLowerCase()] = value
    })
    return out
  }
  if (Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const [key, value] of raw) out[key.toLowerCase()] = value
    return out
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) out[key.toLowerCase()] = String(value)
  }
  return out
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

  it('disables automatic redirects for auth-bound requests', async () => {
    let redirect: RequestRedirect | undefined
    const fetch = fakeFetch((_url, init) => {
      redirect = init.redirect
      return jsonResponse({ ok: true })
    })

    await httpJson(
      { baseUrl: 'https://api.example.com', headers: { 'x-api-key': 'secret' }, fetch },
      { path: '/redirectable' },
    )

    expect(redirect).toBe('error')
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

  describe('auth-bound origin isolation', () => {
    it('rejects cross-origin absolute and protocol-relative paths before fetch', async () => {
      let fetchCalls = 0
      const fetch = fakeFetch(() => {
        fetchCalls += 1
        return jsonResponse({ ok: true })
      })
      const options: HttpToolOptions = {
        baseUrl: 'https://api.example.com',
        fetch,
      }

      await expect(
        httpJson(options, { path: 'https://evil.example.net/steal' }),
      ).rejects.toMatchObject({
        name: 'ToolError',
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      })
      expect(fetchCalls).toBe(0)

      await expect(
        httpJson(options, { path: '//evil.example.net/steal' }),
      ).rejects.toMatchObject({
        name: 'ToolError',
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      })
      expect(fetchCalls).toBe(0)
    })

    it('allows a same-origin absolute URL when baseUrl is configured', async () => {
      let seenUrl = ''
      const fetch = fakeFetch((url) => {
        seenUrl = url
        return jsonResponse({ ok: true })
      })
      await httpJson(
        { baseUrl: 'https://api.example.com/v1/', fetch },
        { path: 'https://api.example.com/v1/items' },
      )
      expect(seenUrl).toBe('https://api.example.com/v1/items')
    })

    it('prevents request.headers from overriding case-insensitive bound headers', async () => {
      let seen: Record<string, string> = {}
      const fetch = fakeFetch((_url, init) => {
        seen = headerBag(init)
        return jsonResponse({ ok: true })
      })
      await httpJson(
        {
          baseUrl: 'https://api.example.com',
          headers: {
            Authorization: 'Bearer bound-token',
            'X-Bound': 'from-options',
          },
          fetch,
        },
        {
          path: '/secure',
          headers: {
            authorization: 'Bearer attacker',
            'x-bound': 'from-request',
            'x-request-id': 'req-1',
          },
        },
      )
      expect(seen.authorization).toBe('Bearer bound-token')
      expect(seen['x-bound']).toBe('from-options')
      expect(seen['x-request-id']).toBe('req-1')
    })
  })

  describe('cancellation and typed transport failures', () => {
    it('composes an optional caller AbortSignal so abort cancels in-flight work', async () => {
      const controller = new AbortController()
      let fetchSignalAborted = false

      const fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        // Abort the caller mid-flight; a composed/forwarded signal must flip.
        controller.abort()
        fetchSignalAborted = init?.signal?.aborted === true
        if (fetchSignalAborted) {
          throw new DOMException('The operation was aborted.', 'AbortError')
        }
        return jsonResponse({ ok: true })
      }) as typeof globalThis.fetch

      const options: HttpToolOptions = {
        baseUrl: 'https://api.example.com',
        fetch,
        timeoutMs: 60_000,
        signal: controller.signal,
      }

      const outcome = await httpJson(options, { path: '/slow' }).then(
        () => ({ kind: 'resolved' as const }),
        (err: unknown) => ({ kind: 'rejected' as const, err }),
      )

      expect(fetchSignalAborted).toBe(true)
      expect(outcome.kind).toBe('rejected')
      if (outcome.kind === 'rejected') {
        expect(outcome.err).toMatchObject({ name: 'AbortError' })
      }
    })

    it('preserves cancellation with a custom abort reason', async () => {
      const controller = new AbortController()
      const reason = new Error('caller cancelled')
      const fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        controller.abort(reason)
        throw init?.signal?.reason
      }) as typeof globalThis.fetch

      await expect(
        httpJson(
          { baseUrl: 'https://api.example.com', fetch, signal: controller.signal },
          { path: '/slow' },
        ),
      ).rejects.toBe(reason)
    })

    it('surfaces raw fetch/network rejections as ToolError with AK_TOOL_EXEC_FAILED and cause', async () => {
      const networkError = new TypeError('fetch failed: ECONNREFUSED')
      const fetch = (async () => {
        throw networkError
      }) as typeof globalThis.fetch

      let caught: unknown
      try {
        await httpJson({ baseUrl: 'https://api.example.com', fetch }, { path: '/down' })
      } catch (err) {
        caught = err
      }

      expect(caught).toBeInstanceOf(ToolError)
      expect(caught).toMatchObject({
        name: 'ToolError',
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      })
      expect((caught as ToolError).cause).toBe(networkError)
    })

    it('does not double-wrap an existing ToolError from fetch', async () => {
      const original = new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'upstream already typed',
        hint: 'do not wrap again',
      })
      const fetch = (async () => {
        throw original
      }) as typeof globalThis.fetch

      let caught: unknown
      try {
        await httpJson({ baseUrl: 'https://api.example.com', fetch }, { path: '/typed' })
      } catch (err) {
        caught = err
      }

      expect(caught).toBe(original)
      expect(caught).toBeInstanceOf(ToolError)
      expect((caught as ToolError).code).toBe(ErrorCodes.AK_TOOL_EXEC_FAILED)
      expect((caught as ToolError).cause).not.toBeInstanceOf(ToolError)
    })
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
