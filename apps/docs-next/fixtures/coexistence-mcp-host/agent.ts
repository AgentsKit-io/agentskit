import { createAgentsKitMcpServer } from '@agentskit/mcp'
import type { McpServer, McpTransport } from '@agentskit/mcp'
import type { ToolDefinition } from '@agentskit/core'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

export const tools: ToolDefinition[] = [
  {
    name: 'add',
    description: 'Add two numbers.',
    schema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'],
    },
    execute: (args: Record<string, unknown>) => String(Number(args.a) + Number(args.b)),
  },
  {
    name: 'explode',
    description: 'Always fails, to show how tool errors reach the host.',
    execute: () => {
      throw new Error('boom')
    },
  },
]

/** Adapt one end of the SDK's in-memory pipe to the AgentsKit MCP transport contract. */
function toAgentsKitTransport(end: Transport): McpTransport {
  const handlers = new Set<Parameters<McpTransport['onMessage']>[0]>()
  end.onmessage = message => {
    for (const handler of handlers) handler(message as never)
  }
  void end.start()
  return {
    send: message => end.send(message as never),
    onMessage: handler => {
      handlers.add(handler)
      return () => void handlers.delete(handler)
    },
    close: () => end.close(),
  }
}

/** The only protocol revision `@agentskit/mcp` negotiates today. */
export const SERVER_PROTOCOL_VERSION = '2024-11-05'

/**
 * The server answers `initialize` only for 2024-11-05, while the current MCP SDK
 * client offers its latest revision first. Until the server negotiates down, a
 * host pins the revision it asks for (the SDK client accepts it as supported).
 */
function pinProtocolVersion(end: Transport): Transport {
  const send = end.send.bind(end)
  end.send = (message, options) => {
    const request = message as { method?: string; params?: { protocolVersion?: string } }
    if (request.method === 'initialize' && request.params) {
      request.params.protocolVersion = SERVER_PROTOCOL_VERSION
    }
    return send(message, options)
  }
  return end
}

/** Start the AgentsKit MCP server; returns the transport end an MCP host connects to. */
export function startServer(): { server: McpServer; hostTransport: Transport } {
  const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair()
  const hostTransport = pinProtocolVersion(clientEnd)
  const server = createAgentsKitMcpServer({ tools, transport: toAgentsKitTransport(serverEnd) })
  return { server, hostTransport }
}
