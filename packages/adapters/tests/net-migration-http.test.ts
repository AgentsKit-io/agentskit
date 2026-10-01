import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'
import { readText } from '@agentskit/net'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'
import { fetchWithRetry, ollama, openai } from '../src'

const request: AdapterRequest = {
  messages: [{ id: '1', role: 'user', content: 'hello', status: 'complete', createdAt: new Date(0) }],
  tools: [],
}

describe('adapter network migration over native HTTP', () => {
  it('retries a real fetch and streams a public adapter response plus final NDJSON line', async () => {
    let retryRequests = 0
    const server = createServer((incoming, response) => {
      if (incoming.url === '/retry') {
        retryRequests++
        if (retryRequests === 1) {
          response.writeHead(503, { 'retry-after': '0' })
          response.end('temporary')
          return
        }
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end('ready')
        return
      }

      if (incoming.url === '/v1/chat/completions') {
        response.writeHead(200, { 'content-type': 'text/event-stream' })
        response.write(Buffer.from('data: {"choices":[{"delta":{"content":"snow '))
        const snowman = Buffer.from('☃')
        response.write(snowman.subarray(0, 1))
        response.write(snowman.subarray(1))
        response.write(Buffer.from('"}}]}\n\n'))
        response.write(Buffer.from('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'))
        response.end('data: [DONE]\n\n')
        return
      }

      if (incoming.url === '/api/chat') {
        response.writeHead(200, { 'content-type': 'application/x-ndjson' })
        response.write(Buffer.from('{"message":{"content":"one"},"done":false}\n{"message":{"content":"snow '))
        const snowman = Buffer.from('☃')
        response.write(snowman.subarray(0, 2))
        response.end(Buffer.concat([snowman.subarray(2), Buffer.from('"},"done":true}')]))
        return
      }

      response.writeHead(404)
      response.end()
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })

    try {
      const { port } = server.address() as AddressInfo
      const origin = `http://127.0.0.1:${port}`
      const delays: number[] = []
      const retries: Array<{ attempt: number; delayMs: number; reason: string }> = []
      const retryController = new AbortController()
      const response = await fetchWithRetry(
        signal => fetch(`${origin}/retry`, { signal }),
        retryController.signal,
        { maxAttempts: 2, sleep: async ms => { delays.push(ms) }, onRetry: info => retries.push(info) },
      )
      expect(await readText(response, { maxBytes: 8 * 1024 })).toBe('ready')
      expect(retryRequests).toBe(2)
      expect(delays).toEqual([0])
      expect(retries).toEqual([{ attempt: 1, delayMs: 0, reason: 'HTTP 503' }])

      const chunks: StreamChunk[] = []
      for await (const chunk of openai({
        apiKey: 'local-test',
        model: 'test-model',
        baseUrl: origin,
        retry: { maxAttempts: 1 },
      }).createSource(request).stream()) chunks.push(chunk)
      expect(chunks.filter(chunk => chunk.type === 'text').map(chunk => chunk.content).join(''))
        .toBe('snow ☃')
      expect(chunks.filter(chunk => chunk.type === 'done')).toHaveLength(1)

      const ollamaChunks: StreamChunk[] = []
      for await (const chunk of ollama({
        model: 'test-model',
        baseUrl: origin,
        retry: { maxAttempts: 1 },
      }).createSource(request).stream()) ollamaChunks.push(chunk)
      expect(ollamaChunks.filter(chunk => chunk.type === 'text').map(chunk => chunk.content).join(''))
        .toBe('onesnow ☃')
      expect(ollamaChunks.filter(chunk => chunk.type === 'done')).toHaveLength(1)
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })
    }
  })
})
