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

/**
 * Bridge one end of the SDK's in-memory pipe to the public `McpTransport`
 * contract that `createAgentsKitMcpServer` accepts. Over stdio the package
 * builds this transport itself; a host embedding the server in-process
 * supplies its own.
 */
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

/** Start the AgentsKit MCP server; returns the transport end an MCP host connects to. */
export function startServer(): { server: McpServer; hostTransport: Transport } {
  const [hostTransport, serverEnd] = InMemoryTransport.createLinkedPair()
  const server = createAgentsKitMcpServer({ tools, transport: toAgentsKitTransport(serverEnd) })
  return { server, hostTransport }
}
