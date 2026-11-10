import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ErrorCodes, ToolError } from '@agentskit/core'
import { NetError } from '@agentskit/net'
import { describe, expect, it } from 'vitest'
import { parsePdf } from '../src/integrations'
import { slackTool } from '../src/slack'

describe('tool response limits over native HTTP', () => {
  it('bounds streamed document downloads and keeps normal bodies', async () => {
    let resolveClosed: () => void = () => {}
    const closed = new Promise<void>(resolve => { resolveClosed = resolve })
    const server = createServer((request, response) => {
      if (request.url === '/large') {
        response.once('close', resolveClosed)
        response.writeHead(200)
        response.write(Buffer.alloc(9, 0x61))
        return
      }
      response.writeHead(200)
      response.end('%PDF')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as AddressInfo
    const baseUrl = `http://127.0.0.1:${address.port}`
    const context = { messages: [], call: { id: '1', name: 'parse_pdf', args: {}, status: 'running' as const } }

    try {
      const normal = parsePdf({
        allowPrivateHosts: true,
        maxBytes: 8,
        parsePdf: bytes => ({ text: new TextDecoder().decode(bytes) }),
      })
      await expect(normal.execute!({ url: `${baseUrl}/normal` }, context)).resolves.toEqual({ text: '%PDF' })

      const oversized = parsePdf({ allowPrivateHosts: true, maxBytes: 8, parsePdf: () => ({ text: '' }) })
      let error: unknown
      try {
        await oversized.execute!({ url: `${baseUrl}/large` }, context)
      } catch (caught) {
        error = caught
      }
      expect(error).toBeInstanceOf(ToolError)
      expect(error).toMatchObject({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: 'document exceeds maxBytes (8)',
        cause: expect.any(NetError),
      })
      await closed
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })

  it('bounds streamed Slack error bodies and preserves normal error text', async () => {
    let resolveClosed: () => void = () => {}
    const closed = new Promise<void>(resolve => { resolveClosed = resolve })
    const server = createServer((request, response) => {
      if (request.url === '/large') {
        response.once('close', resolveClosed)
        response.writeHead(500)
        response.write(Buffer.alloc(1025, 0x61))
        return
      }
      response.writeHead(500)
      response.end('rate limited')
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address() as AddressInfo
    const baseUrl = `http://127.0.0.1:${address.port}`

    try {
      const normal = slackTool({ webhookUrl: `${baseUrl}/normal` })
      await expect(normal.execute({ text: 'hello' })).rejects.toMatchObject({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'slack_send: HTTP 500 Internal Server Error: rate limited',
      })

      const oversized = slackTool({ webhookUrl: `${baseUrl}/large` })
      let error: unknown
      try {
        await oversized.execute({ text: 'hello' })
      } catch (caught) {
        error = caught
      }
      expect(error).toBeInstanceOf(ToolError)
      expect(error).toMatchObject({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'slack_send: HTTP 500 Internal Server Error: ',
        cause: expect.any(NetError),
      })
      await closed
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
