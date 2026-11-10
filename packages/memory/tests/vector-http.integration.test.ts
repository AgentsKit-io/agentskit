import { once } from 'node:events'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo, Socket } from 'node:net'
import { describe, expect, it } from 'vitest'
import { qdrant } from '../src'

const SEARCH_PATH = '/collections/docs/points/search'
const STORE_PATH = '/collections/docs/points'
const OVERFLOW_HINT = 'Increase maxResponseBytes only when the upstream response is trusted and bounded.'

async function withServer(
  handle: (request: IncomingMessage, response: ServerResponse) => void,
  run: (url: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handle)
  const sockets = new Set<Socket>()
  server.on('connection', socket => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Local HTTP server did not bind a TCP port.')
  try {
    await run(`http://127.0.0.1:${(address as AddressInfo).port}`)
  } finally {
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve())
    })
  }
}

function json(response: ServerResponse, value: unknown, status = 200, extraHeaders: Record<string, string> = {}): void {
  const body = Buffer.from(JSON.stringify(value))
  response.writeHead(status, {
    'content-type': 'application/json',
    'content-length': String(body.byteLength),
    ...extraHeaders,
  })
  response.end(body)
}

function requestText(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', chunk => chunks.push(Buffer.from(chunk)))
    request.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.once('error', reject)
  })
}

describe('qdrant native HTTP flow', () => {
  it('stores and searches through the public backend with native fetch', async () => {
    let stored: unknown
    await withServer((request, response) => {
      if (request.method === 'PUT' && request.url === STORE_PATH) {
        void requestText(request).then(body => {
          stored = JSON.parse(body)
          response.writeHead(204)
          response.end()
        })
        return
      }
      if (request.method === 'POST' && request.url === SEARCH_PATH) {
        json(response, {
          result: [{ id: 'point-1', score: 0.82, payload: { content: 'result', __agentskitSourceId: 'doc-1' } }],
        })
        return
      }
      response.writeHead(404).end()
    }, async url => {
      const memory = qdrant({ url, collection: 'docs' })
      await memory.store([{ id: 'doc-1', content: 'result', embedding: [1, 2] }])
      expect(stored).toMatchObject({ points: [{ vector: [1, 2], payload: { content: 'result' } }] })
      await expect(memory.search([1, 2])).resolves.toMatchObject([
        { id: 'doc-1', content: 'result', score: 0.82 },
      ])
    })
  }, 3000)

  it('treats an empty success body as an empty search result', async () => {
    await withServer((_request, response) => response.writeHead(200).end(), async url => {
      await expect(qdrant({ url, collection: 'docs' }).search([1])).resolves.toEqual([])
    })
  }, 3000)

  it('wraps malformed JSON with the parse cause', async () => {
    await withServer((_request, response) => response.end('{bad'), async url => {
      const error = await qdrant({ url, collection: 'docs' }).search([1]).catch(value => value as Error & { code: string; cause: unknown })
      expect(error).toMatchObject({ code: 'AK_MEMORY_REMOTE_HTTP', message: 'qdrant returned invalid JSON.' })
      expect(error.cause).toBeInstanceOf(SyntaxError)
    })
  }, 3000)

  it('truncates non-OK text to 200 characters and never retries the search POST', async () => {
    let hits = 0
    const body = 'x'.repeat(260)
    await withServer((_request, response) => {
      hits++
      response.writeHead(503, { 'content-length': String(body.length) }).end(body)
    }, async url => {
      const error = await qdrant({ url, collection: 'docs' }).search([1]).catch(value => value as Error & { code: string; hint: string })
      expect(error).toMatchObject({
        code: 'AK_MEMORY_REMOTE_HTTP',
        message: `qdrant 503: ${body.slice(0, 200)}`,
        hint: 'Check the qdrant endpoint and credentials.',
      })
      expect(hits).toBe(1)
    })
  }, 3000)

  it('accepts a body exactly at the configured byte limit', async () => {
    const body = '{"result":[]}'
    const maxResponseBytes = Buffer.byteLength(body)
    await withServer((_request, response) => {
      response.writeHead(200, { 'content-length': String(maxResponseBytes) }).end(body)
    }, async url => {
      await expect(qdrant({ url, collection: 'docs', maxResponseBytes }).search([1])).resolves.toEqual([])
    })
  }, 3000)

  it('maps declared overflow to the memory error and preserves its hint', async () => {
    const body = 'x'.repeat(33)
    await withServer((_request, response) => {
      response.writeHead(200, { 'content-length': String(body.length) }).end(body)
    }, async url => {
      const error = await qdrant({ url, collection: 'docs', maxResponseBytes: 32 }).search([1]).catch(value => value as Error & { code: string; hint: string })
      expect(error).toMatchObject({
        code: 'AK_MEMORY_REMOTE_HTTP',
        message: 'qdrant response exceeds the configured byte limit.',
        hint: OVERFLOW_HINT,
      })
    })
  }, 3000)

  it('cancels a chunked overflowing response and closes the server stream', async () => {
    let closed!: () => void
    const streamClosed = new Promise<void>(resolve => { closed = resolve })
    await withServer((_request, response) => {
      response.once('close', () => {
        if (!response.writableFinished) closed()
      })
      response.writeHead(200)
      response.flushHeaders()
      response.write('x'.repeat(17))
      const timer = setTimeout(() => response.end('later'), 1000)
      response.once('close', () => clearTimeout(timer))
    }, async url => {
      const error = await qdrant({ url, collection: 'docs', maxResponseBytes: 16 }).search([1]).catch(value => value as Error & { code: string; message: string })
      expect(error).toMatchObject({ code: 'AK_MEMORY_REMOTE_HTTP', message: 'qdrant response exceeds the configured byte limit.' })
      await streamClosed
    })
  }, 3000)

  it('decodes a UTF-8 character split across HTTP chunks', async () => {
    const body = Buffer.from(JSON.stringify({
      result: [{ id: 'point-1', score: 0.9, payload: { content: 'café', __agentskitSourceId: 'doc-1' } }],
    }))
    const split = body.indexOf(Buffer.from('é')) + 1
    await withServer((_request, response) => {
      response.writeHead(200, { 'content-length': String(body.byteLength) })
      response.write(body.subarray(0, split))
      setTimeout(() => response.end(body.subarray(split)), 5)
    }, async url => {
      await expect(qdrant({ url, collection: 'docs' }).search([1])).resolves.toMatchObject([
        { id: 'doc-1', content: 'café', score: 0.9 },
      ])
    })
  }, 3000)

  it('does not send a pre-aborted parent request', async () => {
    let hits = 0
    await withServer((_request, response) => {
      hits++
      json(response, { result: [] })
    }, async url => {
      const controller = new AbortController()
      controller.abort()
      await expect(qdrant({ url, collection: 'docs', signal: controller.signal }).search([1])).rejects.toHaveProperty('name', 'AbortError')
      expect(hits).toBe(0)
    })
  }, 3000)

  it('cancels a response body when the parent signal aborts', async () => {
    let started!: () => void
    let closed!: () => void
    const responseStarted = new Promise<void>(resolve => { started = resolve })
    const streamClosed = new Promise<void>(resolve => { closed = resolve })
    await withServer((_request, response) => {
      response.once('close', () => {
        if (!response.writableFinished) closed()
      })
      response.writeHead(200)
      response.flushHeaders()
      started()
      const timer = setTimeout(() => response.end('{}'), 1000)
      response.once('close', () => clearTimeout(timer))
    }, async url => {
      const controller = new AbortController()
      const search = qdrant({ url, collection: 'docs', signal: controller.signal }).search([1])
      await responseStarted
      controller.abort()
      await expect(search).rejects.toHaveProperty('name', 'AbortError')
      await streamClosed
    })
  }, 3000)

  it('times out before response headers', async () => {
    await withServer((_request, response) => {
      const timer = setTimeout(() => response.end('{}'), 1000)
      response.once('close', () => clearTimeout(timer))
    }, async url => {
      await expect(qdrant({ url, collection: 'docs', timeoutMs: 60 }).search([1])).rejects.toMatchObject({
        code: 'AK_MEMORY_REMOTE_HTTP',
        message: 'qdrant request timed out after 60ms.',
      })
    })
  }, 3000)

  it('times out while reading a response body', async () => {
    let closed!: () => void
    const streamClosed = new Promise<void>(resolve => { closed = resolve })
    await withServer((_request, response) => {
      response.once('close', () => {
        if (!response.writableFinished) closed()
      })
      response.writeHead(200)
      response.flushHeaders()
      const timer = setTimeout(() => response.end('{}'), 1000)
      response.once('close', () => clearTimeout(timer))
    }, async url => {
      await expect(qdrant({ url, collection: 'docs', timeoutMs: 60 }).search([1])).rejects.toMatchObject({
        code: 'AK_MEMORY_REMOTE_HTTP',
        message: 'qdrant request timed out after 60ms.',
      })
      await streamClosed
    })
  }, 3000)
})
