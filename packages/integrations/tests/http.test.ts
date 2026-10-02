import { describe, it, expect } from 'vitest'
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { ErrorCodes, ToolError } from '@agentskit/core'
import { NetErrorCodes } from '@agentskit/net'
import { composeTimeoutSignal, httpJson, bindHttp, type HttpToolOptions } from '../src'
import { readResponseBytes } from '../src/http-body'

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

async function startLocalServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<{ server: Server; origin: string }> {
  const server = createServer(handler)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('local HTTP server did not bind a TCP address')
  return { server, origin: `http://127.0.0.1:${address.port}` }
}

async function closeLocalServer(server: Server): Promise<void> {
  const closed = new Promise<void>((resolve) => server.close(() => resolve()))
  server.closeAllConnections()
  await closed
}

describe('httpJson', () => {
  it('reads binary responses within the configured byte budget', async () => {
    await expect(readResponseBytes(new Response(new Uint8Array([1, 2, 3])), 2)).rejects.toMatchObject({ code: ErrorCodes.AK_TOOL_EXEC_FAILED })
  })

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

  it('rejects oversized response bodies before parsing', async () => {
    const fetch = fakeFetch(() => new Response('12345', {
      status: 200,
      headers: { 'content-length': '5' },
    }))
    await expect(httpJson({ baseUrl: 'https://api.example.com', fetch, maxResponseBytes: 4 }, { path: '/large' }))
      .rejects.toMatchObject({ code: ErrorCodes.AK_TOOL_EXEC_FAILED })
  })

  it('rejects invalid timeout and retry budgets', async () => {
    expect(() => composeTimeoutSignal(Number.POSITIVE_INFINITY)).toThrow(ToolError)
    await expect(
      httpJson(
        { baseUrl: 'https://api.example.com', retry: { maxAttempts: Number.POSITIVE_INFINITY } },
        { path: '/retry' },
      ),
    ).rejects.toMatchObject({ code: ErrorCodes.AK_TOOL_INVALID_INPUT })
  })

  it('throws on non-2xx with the server body attached', async () => {
    const fetch = fakeFetch(() => new Response('nope', { status: 404, statusText: 'Not Found' }))
    await expect(
      httpJson({ baseUrl: 'https://api.example.com', fetch }, { path: '/missing' }),
    ).rejects.toThrow(/HTTP 404/)
  })

  it('redacts sensitive fields from upstream response diagnostics', async () => {
    const fetch = fakeFetch(() => new Response('{"access_token":"SYNTHETIC-SECRET"}', { status: 500 }))
    const outcome = await httpJson(
      { baseUrl: 'https://api.example.com', fetch },
      { path: '/failed' },
    ).then(
      () => undefined,
      (error: unknown) => error as { message?: string },
    )

    expect(outcome?.message).not.toContain('SYNTHETIC-SECRET')
    expect(outcome?.message).toContain('[REDACTED]')
  })

  it('does not expose credential-bearing request paths in transport hints', async () => {
    const fetch = fakeFetch(() => new Response('nope', { status: 500, statusText: 'Server Error' }))
    const outcome = await httpJson(
      { baseUrl: 'https://api.example.com', fetch },
      { path: '/botSYNTHETIC-SECRET/sendMessage' },
    ).then(
      () => undefined,
      (error: unknown) => error as { hint?: string; message?: string },
    )

    expect(outcome?.hint).not.toContain('SYNTHETIC-SECRET')
    expect(outcome?.message).not.toContain('SYNTHETIC-SECRET')
  })

  it('does not expose credential-bearing request paths in invalid JSON errors', async () => {
    const fetch = fakeFetch(() => new Response('{bad', { status: 500, headers: { 'content-type': 'application/json' } }))
    const outcome = await httpJson(
      { baseUrl: 'https://api.example.com', fetch },
      { path: '/botSYNTHETIC-SECRET/sendMessage' },
    ).then(
      () => undefined,
      (error: unknown) => error as { hint?: string; message?: string },
    )

    expect(outcome?.hint).not.toContain('SYNTHETIC-SECRET')
    expect(outcome?.message).not.toContain('SYNTHETIC-SECRET')
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
    it('retries idempotent requests on transient responses when configured', async () => {
      let calls = 0
      const fetch = fakeFetch(() => {
        calls += 1
        return calls === 1 ? new Response('busy', { status: 503 }) : jsonResponse({ ok: true })
      })

      await expect(
        httpJson(
          { baseUrl: 'https://api.example.com', fetch, retry: { maxAttempts: 2, baseDelayMs: 0 } },
          { path: '/status' },
        ),
      ).resolves.toEqual({ ok: true })
      expect(calls).toBe(2)
    })

    it('does not retry external POSTs by default', async () => {
      let calls = 0
      const fetch = fakeFetch(() => {
        calls += 1
        return new Response('busy', { status: 503 })
      })

      await expect(
        httpJson(
          { baseUrl: 'https://api.example.com', fetch, retry: { maxAttempts: 3, baseDelayMs: 0 } },
          { method: 'POST', path: '/send', body: { message: 'hi' } },
        ),
      ).rejects.toThrow(/HTTP 503/)
      expect(calls).toBe(1)
    })

    it('allows an explicitly replayable method and honors Retry-After through injected seams', async () => {
      let calls = 0
      const delays: number[] = []
      const now = Date.UTC(2023, 10, 14, 22, 13, 20)
      const fetch = fakeFetch(() => {
        calls += 1
        if (calls === 1) return new Response('busy', {
          status: 429,
          headers: { 'retry-after': 'Tue, 14 Nov 2023 22:13:22 GMT' },
        })
        return jsonResponse({ ok: true })
      })

      await expect(
        httpJson(
          {
            baseUrl: 'https://api.example.com',
            fetch,
            now: () => now,
            sleep: async (delayMs) => {
              delays.push(delayMs)
            },
            retry: { maxAttempts: 2, methods: ['POST'] },
          },
          { method: 'POST', path: '/send', body: { message: 'hi' } },
        ),
      ).resolves.toEqual({ ok: true })
      expect(calls).toBe(2)
      expect(delays).toEqual([2_000])
    })

    it('uses deterministic capped exponential backoff without retrying network errors', async () => {
      let calls = 0
      const delays: number[] = []
      const fetch = fakeFetch(() => {
        calls += 1
        return calls < 3 ? new Response('busy', { status: 503 }) : jsonResponse({ ok: true })
      })

      await expect(httpJson(
        {
          baseUrl: 'https://api.example.com',
          fetch,
          sleep: async (delayMs) => { delays.push(delayMs) },
          retry: { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 15 },
        },
        { path: '/backoff' },
      )).resolves.toEqual({ ok: true })
      expect(delays).toEqual([10, 15])

      let networkCalls = 0
      const failedFetch = (async () => {
        networkCalls += 1
        throw new TypeError('fetch failed')
      }) as typeof globalThis.fetch
      await expect(httpJson(
        { baseUrl: 'https://api.example.com', fetch: failedFetch, retry: { maxAttempts: 3 } },
        { path: '/network-error' },
      )).rejects.toMatchObject({ code: ErrorCodes.AK_TOOL_EXEC_FAILED })
      expect(networkCalls).toBe(1)
    })

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

describe('native HTTP acceptance', () => {
  it('reuses retry, body-limit, origin, redirect, and auth contracts with real fetch', async () => {
    let targetHits = 0
    let retryCalls = 0
    let retryDelay = -1
    let capCalls = 0
    let capDelay = -1
    let authorization = ''
    const target = await startLocalServer((_request, response) => {
      targetHits += 1
      response.end('should not receive auth-bound requests')
    })
    const primary = await startLocalServer((request, response) => {
      switch (request.url) {
        case '/retry':
          retryCalls += 1
          if (retryCalls === 1) {
            response.writeHead(429, { 'retry-after': '0.0005', 'content-type': 'application/json' }).end('{"busy":true}')
          } else {
            response.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
          }
          return
        case '/cap':
          capCalls += 1
          if (capCalls === 1) response.writeHead(503, { 'retry-after': '5' }).end('busy')
          else response.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
          return
        case '/headers':
          authorization = request.headers.authorization ?? ''
          response.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}')
          return
        case '/redirect':
          response.writeHead(302, { location: `${target.origin}/stolen` }).end()
          return
        case '/length':
          response.writeHead(200, { 'content-type': 'text/plain', 'content-length': '5' }).end('12345')
          return
        case '/chunked':
          response.writeHead(200, { 'content-type': 'text/plain' })
          response.write('123')
          response.end('456')
          return
        default:
          response.writeHead(404).end()
      }
    })

    try {
      await expect(httpJson(
        {
          baseUrl: primary.origin,
          retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 10 },
          sleep: async (delayMs) => { retryDelay = delayMs },
        },
        { path: '/retry' },
      )).resolves.toEqual({ ok: true })
      expect(retryCalls).toBe(2)
      expect(retryDelay).toBe(1)

      await expect(httpJson(
        {
          baseUrl: primary.origin,
          retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 10 },
          sleep: async (delayMs) => { capDelay = delayMs },
        },
        { path: '/cap' },
      )).resolves.toEqual({ ok: true })
      expect(capCalls).toBe(2)
      expect(capDelay).toBe(10)

      await httpJson(
        { baseUrl: primary.origin, headers: { authorization: 'Bearer bound' } },
        { path: '/headers', headers: { Authorization: 'Bearer request' } },
      )
      expect(authorization).toBe('Bearer bound')

      await expect(httpJson(
        { baseUrl: primary.origin },
        { path: `${target.origin}/origin-escape` },
      )).rejects.toMatchObject({ name: 'ToolError', code: ErrorCodes.AK_TOOL_INVALID_INPUT })
      await expect(httpJson(
        { baseUrl: primary.origin, headers: { authorization: 'Bearer bound' } },
        { path: '/redirect' },
      )).rejects.toBeInstanceOf(ToolError)
      expect(targetHits).toBe(0)

      const lengthResponse = await fetch(`${primary.origin}/length`)
      await expect(readResponseBytes(lengthResponse, 4)).rejects.toMatchObject({
        name: 'ToolError',
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        cause: { name: 'NetError', code: NetErrorCodes.AK_NET_BODY_TOO_LARGE },
      })
      await expect(httpJson(
        { baseUrl: primary.origin, maxResponseBytes: 4 },
        { path: '/chunked' },
      )).rejects.toMatchObject({
        name: 'ToolError',
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        cause: { name: 'NetError', code: NetErrorCodes.AK_NET_BODY_TOO_LARGE },
      })
    } finally {
      await Promise.all([closeLocalServer(primary.server), closeLocalServer(target.server)])
    }
  })

  it('keeps the deadline over custom retry waits and physically aborts real fetch/body reads', async () => {
    let delayedRetryCalls = 0
    let timeoutClosed = false
    let callerAbortClosed = false
    let resolveTimeoutClose: () => void = () => {}
    let resolveCallerAbortClose: () => void = () => {}
    const timeoutClosedEvent = new Promise<void>((resolve) => { resolveTimeoutClose = resolve })
    const callerAbortClosedEvent = new Promise<void>((resolve) => { resolveCallerAbortClose = resolve })
    const server = await startLocalServer((request, response) => {
      if (request.url === '/deadline-retry') {
        delayedRetryCalls += 1
        response.writeHead(503, { 'retry-after': '0' }).end('busy')
        return
      }
      if (request.url === '/timeout') {
        response.writeHead(200, { 'content-type': 'application/json' })
        const timer = setTimeout(() => response.end('{"ok":true}'), 250)
        response.on('close', () => { timeoutClosed = true; clearTimeout(timer); resolveTimeoutClose() })
        return
      }
      if (request.url === '/caller-abort') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.write('{')
        const timer = setTimeout(() => response.end('"ok":true}'), 250)
        response.on('close', () => { callerAbortClosed = true; clearTimeout(timer); resolveCallerAbortClose() })
        return
      }
      response.writeHead(404).end()
    })

    try {
      await expect(httpJson(
        {
          baseUrl: server.origin,
          timeoutMs: 30,
          retry: { maxAttempts: 2 },
          sleep: async () => new Promise<void>(() => {}),
        },
        { path: '/deadline-retry' },
      )).rejects.toMatchObject({ name: 'TimeoutError' })
      expect(delayedRetryCalls).toBe(1)

      await expect(httpJson(
        { baseUrl: server.origin, timeoutMs: 30 },
        { path: '/timeout' },
      )).rejects.toMatchObject({ name: 'TimeoutError' })
      await Promise.race([timeoutClosedEvent, new Promise((resolve) => setTimeout(resolve, 100))])
      expect(timeoutClosed).toBe(true)

      const controller = new AbortController()
      const reason = new Error('caller cancelled')
      const abortTimer = setTimeout(() => controller.abort(reason), 30)
      try {
        await expect(httpJson(
          { baseUrl: server.origin, timeoutMs: 1_000, signal: controller.signal },
          { path: '/caller-abort' },
        )).rejects.toBe(reason)
      } finally {
        clearTimeout(abortTimer)
      }
      await Promise.race([callerAbortClosedEvent, new Promise((resolve) => setTimeout(resolve, 100))])
      expect(callerAbortClosed).toBe(true)
    } finally {
      await closeLocalServer(server.server)
    }
  })

  it('keeps cleanup and caller abort semantics on the compatibility timeout wrapper', async () => {
    const timed = composeTimeoutSignal(20)
    timed.cleanup()
    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(timed.signal.aborted).toBe(false)
    timed.cleanup()

    const controller = new AbortController()
    const reason = new Error('outer cancelled')
    const composed = composeTimeoutSignal(1_000, controller.signal)
    controller.abort(reason)
    expect(composed.signal.reason).toBe(reason)
    composed.cleanup()
  })
})
