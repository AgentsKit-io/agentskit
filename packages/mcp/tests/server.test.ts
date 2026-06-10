import { describe, it, expect } from 'vitest'
import type { ToolDefinition } from '@agentskit/core'
import { createInMemoryTransportPair, type JsonRpcMessage } from '@agentskit/tools/mcp'
import { createAgentsKitMcpServer } from '../src/index'

const echo: ToolDefinition = {
  name: 'echo',
  description: 'Echo the input text.',
  schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  execute: (args: Record<string, unknown>) => ({ echoed: args.text }),
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('createAgentsKitMcpServer', () => {
  it('lists and calls exposed tools over an MCP transport', async () => {
    const [client, server] = createInMemoryTransportPair()
    const srv = createAgentsKitMcpServer({ tools: [echo], transport: server })

    const got: JsonRpcMessage[] = []
    client.onMessage((m) => got.push(m))

    await client.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
    await client.send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
    await client.send({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'echo', arguments: { text: 'hi' } },
    })
    await flush()

    const serialized = JSON.stringify(got)
    expect(serialized).toContain('echo')
    expect(serialized).toContain('hi')

    const listResponse = got.find((m) => 'id' in m && m.id === 2)
    expect(listResponse).toBeDefined()

    await srv.close()
  })

  it('reports tool errors via onEvent without crashing', async () => {
    const boom: ToolDefinition = {
      name: 'boom',
      description: 'always throws',
      schema: { type: 'object' },
      execute: () => {
        throw new Error('kaboom')
      },
    }
    const [client, server] = createInMemoryTransportPair()
    const events: string[] = []
    const srv = createAgentsKitMcpServer({
      tools: [boom],
      transport: server,
      onEvent: (e) => events.push(e.type),
    })
    client.onMessage(() => {})
    await client.send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'boom', arguments: {} } })
    await flush()
    expect(events).toContain('error')
    await srv.close()
  })
})
