import { ok } from 'node:assert/strict'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { ErrorCodes } from '@agentskit/core'
import { describe, expect, it } from 'vitest'
import { deepgramTranscribe } from '../src/services/deepgram/actions'
import { twilioSendSms } from '../src/services/twilio/actions'

async function startServer(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<{ server: Server; origin: string }> {
  const server = createServer(handler)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  ok(address && typeof address !== 'string', 'local HTTP server did not bind a TCP address')
  return { server, origin: `http://127.0.0.1:${address.port}` }
}

async function closeServer(server: Server): Promise<void> {
  const closed = new Promise<void>(resolve => server.close(() => resolve()))
  server.closeAllConnections()
  await closed
}

describe('service response body limits', () => {
  it('bounds transcription text and cancels an oversized streamed response', async () => {
    let closedEarly!: () => void
    const earlyClose = new Promise<void>(resolve => { closedEarly = resolve })
    const { server, origin } = await startServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.on('close', () => {
        if (!response.writableEnded) closedEarly()
      })
      // Keep streaming until the client cancels, so the early-close assertion never races response.end().
      const timer = setInterval(() => response.write('x'.repeat(32)), 10)
      response.on('close', () => clearInterval(timer))
      response.write('x'.repeat(32))
    })
    try {
      await expect(deepgramTranscribe.execute(
        { url: 'https://audio.example/file.mp3' },
        {
          http: async () => ({}),
          fetch: globalThis.fetch,
          config: { apiKey: 'test', baseUrl: origin },
          maxResponseBytes: 16,
        },
      )).rejects.toMatchObject({ code: ErrorCodes.AK_TOOL_EXEC_FAILED })
      await earlyClose

      const normalServer = await startServer((_request, response) => {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ results: { channels: [{ alternatives: [{ transcript: 'hello' }] }] } }))
      })
      try {
        await expect(deepgramTranscribe.execute(
          { url: 'https://audio.example/file.mp3' },
          {
            http: async () => ({}),
            fetch: globalThis.fetch,
            config: { apiKey: 'test', baseUrl: normalServer.origin },
            maxResponseBytes: 1024,
          },
        )).resolves.toMatchObject({ text: 'hello' })
      } finally {
        await closeServer(normalServer.server)
      }
    } finally {
      await closeServer(server)
    }
  })

  it('bounds JSON acknowledgements and preserves normal Twilio results', async () => {
    let closedEarly!: () => void
    const earlyClose = new Promise<void>(resolve => { closedEarly = resolve })
    const { server, origin } = await startServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' })
      response.on('close', () => {
        if (!response.writableEnded) closedEarly()
      })
      // Keep streaming until the client cancels, so the early-close assertion never races response.end().
      const timer = setInterval(() => response.write('x'.repeat(32)), 10)
      response.on('close', () => clearInterval(timer))
      response.write('x'.repeat(32))
    })
    try {
      const args = { to: '+14155552671', body: 'hello' }
      const config = { accountSid: 'AC123', authToken: 'test', fromNumber: '+14155552672', baseUrl: origin }
      await expect(twilioSendSms.execute(args, {
        http: async () => ({}),
        fetch: globalThis.fetch,
        config,
        maxResponseBytes: 16,
      })).rejects.toMatchObject({ code: ErrorCodes.AK_TOOL_EXEC_FAILED })
      await earlyClose

      const normalServer = await startServer((_request, response) => {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ sid: 'SM123', status: 'queued' }))
      })
      try {
        await expect(twilioSendSms.execute(args, {
          http: async () => ({}),
          fetch: globalThis.fetch,
          config: { ...config, baseUrl: normalServer.origin },
          maxResponseBytes: 1024,
        })).resolves.toEqual({ sid: 'SM123', status: 'queued' })
      } finally {
        await closeServer(normalServer.server)
      }
    } finally {
      await closeServer(server)
    }
  })
})
