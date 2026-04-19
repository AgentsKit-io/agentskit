import type { ToolDefinition } from '@agentskit/core'
import type {
  JsonRpcMessage,
  JsonRpcRequest,
  McpTransport,
} from './types'

export interface McpServerOptions {
  transport: McpTransport
  tools: ToolDefinition[]
  serverInfo?: { name: string; version: string }
  /** Observability hook. */
  onEvent?: (event: { type: 'call' | 'error' | 'list'; tool?: string; error?: string }) => void
}

export interface McpServer {
  close: () => Promise<void>
}

/**
 * Expose a set of AgentsKit tools as an MCP server over any
 * `McpTransport`. Implements the three methods most MCP hosts need:
 * `initialize`, `tools/list`, `tools/call`.
 */
export function createMcpServer(options: McpServerOptions): McpServer {
  const { transport, tools } = options
  const serverInfo = options.serverInfo ?? { name: 'agentskit-mcp-server', version: '0.1.0' }

  const respond = async (message: JsonRpcMessage): Promise<void> => {
    try {
      await transport.send(message)
    } catch {
      // transport already errored — nothing to do
    }
  }

  const detach = transport.onMessage(async raw => {
    if (!('method' in raw)) return
    const request = raw as JsonRpcRequest
    const hasId = 'id' in request

    try {
      if (request.method === 'initialize') {
        if (!hasId) return
        await respond({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo,
          },
        })
        return
      }

      if (request.method === 'tools/list') {
        options.onEvent?.({ type: 'list' })
        if (!hasId) return
        await respond({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: tools.map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.schema ?? { type: 'object', properties: {} },
            })),
          },
        })
        return
      }

      if (request.method === 'tools/call') {
        if (!hasId) return
        const params = request.params as { name?: string; arguments?: Record<string, unknown> } | undefined
        const tool = tools.find(t => t.name === params?.name)
        if (!tool || !tool.execute) {
          options.onEvent?.({ type: 'error', tool: params?.name, error: 'unknown tool' })
          await respond({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32602, message: `unknown tool: ${params?.name}` },
          })
          return
        }
        options.onEvent?.({ type: 'call', tool: tool.name })
        try {
          const result = await tool.execute(params?.arguments ?? {}, {
            messages: [],
            call: { id: String(request.id), name: tool.name, args: params?.arguments ?? {}, status: 'running' },
          })
          const text = typeof result === 'string' ? result : JSON.stringify(result)
          await respond({
            jsonrpc: '2.0',
            id: request.id,
            result: { content: [{ type: 'text', text }] },
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          options.onEvent?.({ type: 'error', tool: tool.name, error: message })
          await respond({
            jsonrpc: '2.0',
            id: request.id,
            result: { content: [{ type: 'text', text: message }], isError: true },
          })
        }
        return
      }

      if (hasId) {
        await respond({
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32601, message: `method not found: ${request.method}` },
        })
      }
    } catch (err) {
      if (hasId) {
        await respond({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32603,
            message: err instanceof Error ? err.message : String(err),
          },
        })
      }
    }
  })

  return {
    async close() {
      detach()
      await transport.close?.()
    },
  }
}
