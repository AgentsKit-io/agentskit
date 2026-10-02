import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { loadConfluencePage, loadPdf } from '../src/loaders'

async function startServer(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const server = createServer(handler)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected a local TCP address')
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

async function expectClosed(promise: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('HTTP transport stayed open after cancellation')), 1_000)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const parsePdf = (bytes: Uint8Array) => ({ text: new TextDecoder().decode(bytes) })

describe('native loader HTTP cancellation', () => {
  it('closes a request that times out before response headers', async () => {
    const closed = deferred()
    const server = await startServer((_request, response) => {
      const timer = setTimeout(() => response.end('late'), 1_000)
      response.once('close', () => {
        clearTimeout(timer)
        closed.resolve()
      })
    })
    try {
      await expect(loadPdf(`${server.url}/slow-headers`, { parsePdf, timeoutMs: 40 })).rejects.toMatchObject({
        code: 'AK_RAG_LOAD_FAILED',
        message: 'loadPdf: timed out after 40ms',
        cause: expect.objectContaining({ code: 'AK_NET_TIMEOUT' }),
      })
      await expectClosed(closed.promise)
    } finally {
      await server.close()
    }
  })

  it('closes a body-read timeout and successfully recovers on the next request', async () => {
    const closed = deferred()
    const server = await startServer((request, response) => {
      if (request.url === '/ok') {
        response.end('recovered')
        return
      }
      response.once('close', closed.resolve)
      response.writeHead(200, { 'content-type': 'application/pdf' })
      response.flushHeaders()
      response.write('partial')
    })
    try {
      await expect(loadPdf(`${server.url}/slow-body`, { parsePdf, timeoutMs: 50 })).rejects.toMatchObject({
        code: 'AK_RAG_LOAD_FAILED',
        message: 'loadPdf: timed out after 50ms',
        cause: expect.objectContaining({ code: 'AK_NET_TIMEOUT' }),
      })
      await expectClosed(closed.promise)
      await expect(loadPdf(`${server.url}/ok`, { parsePdf })).resolves.toEqual([
        expect.objectContaining({ content: 'recovered' }),
      ])
    } finally {
      await server.close()
    }
  })

  it('closes native requests for parent aborts before and after headers', async () => {
    const beforeClosed = deferred()
    const beforeAbort = new AbortController()
    const beforeServer = await startServer((_request, response) => {
      response.once('close', beforeClosed.resolve)
      const timer = setTimeout(() => response.end('late'), 1_000)
      response.once('close', () => clearTimeout(timer))
      beforeAbort.abort(new DOMException('Aborted', 'AbortError'))
    })
    try {
      await expect(loadPdf(`${beforeServer.url}/slow-headers`, {
        parsePdf,
        signal: beforeAbort.signal,
      })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/aborted/) })
      await expectClosed(beforeClosed.promise)
    } finally {
      await beforeServer.close()
    }

    const afterClosed = deferred()
    const afterAbort = new AbortController()
    const afterServer = await startServer((_request, response) => {
      response.once('close', afterClosed.resolve)
      response.writeHead(200, { 'content-type': 'application/pdf' })
      response.flushHeaders()
      response.write('partial')
    })
    const fetchAfterHeaders: typeof globalThis.fetch = async (input, init) => {
      const response = await globalThis.fetch(input, init)
      setImmediate(() => afterAbort.abort(new DOMException('Aborted', 'AbortError')))
      return response
    }
    const parser = vi.fn(parsePdf)
    try {
      await expect(loadPdf(`${afterServer.url}/slow-body`, {
        fetch: fetchAfterHeaders,
        parsePdf: parser,
        signal: afterAbort.signal,
      })).rejects.toMatchObject({ code: 'AK_RAG_LOAD_FAILED', message: expect.stringMatching(/aborted/) })
      expect(parser).not.toHaveBeenCalled()
      await expectClosed(afterClosed.promise)
    } finally {
      await afterServer.close()
    }
  })

  it('cancels content-length and chunked overflows with the RagError boundary', async () => {
    const closes = new Map<string, Promise<void>>()
    const server = await startServer((request, response) => {
      let resolveClosed!: () => void
      const closed = new Promise<void>(resolve => { resolveClosed = resolve })
      closes.set(request.url ?? '/', closed)
      response.once('close', resolveClosed)
      if (request.url === '/declared') {
        const timer = setTimeout(() => response.end('0123456789'), 1_000)
        response.once('close', () => clearTimeout(timer))
        response.writeHead(200, { 'content-length': '10' })
        response.flushHeaders()
      } else {
        response.writeHead(200)
        response.flushHeaders()
        response.write('1234')
      }
    })
    try {
      for (const path of ['/declared', '/chunked']) {
        await expect(loadPdf(`${server.url}${path}`, { parsePdf, maxResponseBytes: 3 })).rejects.toMatchObject({
          code: 'AK_RAG_LOAD_FAILED',
          message: 'loadPdf: response exceeds 3 bytes',
          cause: expect.objectContaining({ code: 'AK_NET_BODY_TOO_LARGE' }),
        })
        await expectClosed(closes.get(path)!)
      }
    } finally {
      await server.close()
    }
  })

  it('keeps invalid JSON as a RagError with the parser cause', async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end('{invalid')
    })
    try {
      await expect(loadConfluencePage('page', { baseUrl: server.url })).rejects.toMatchObject({
        code: 'AK_RAG_LOAD_FAILED',
        message: 'loadConfluencePage: failed to parse response body',
        cause: expect.any(SyntaxError),
      })
    } finally {
      await server.close()
    }
  })
})
