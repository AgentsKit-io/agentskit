import type { ToolDefinition } from '@agentskit/core'
import type {
  JsonRpcMessage,
  JsonRpcSuccess,
  JsonRpcError,
  McpCallToolResult,
  McpToolsListResult,
  McpTransport,
} from './types'

export interface McpClient {
  initialize: () => Promise<{ serverInfo: { name: string; version?: string } }>
  listTools: () => Promise<McpToolsListResult>
  callTool: (name: string, args: Record<string, unknown>) => Promise<McpCallToolResult>
  close: () => Promise<void>
}

function isResponse(msg: JsonRpcMessage): msg is JsonRpcSuccess | JsonRpcError {
  return 'id' in msg && (('result' in msg) || ('error' in msg))
}

function isError(msg: JsonRpcSuccess | JsonRpcError): msg is JsonRpcError {
  return 'error' in msg
}

/**
 * Build an MCP client over any `McpTransport`. Supports
 * `initialize`, `tools/list`, and `tools/call` — the minimum needed
 * to drive external MCP servers as AgentsKit tools.
 */
export function createMcpClient(options: {
  transport: McpTransport
  clientInfo?: { name: string; version: string }
}): McpClient {
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
  let nextId = 1

  const detach = options.transport.onMessage(message => {
    if (!isResponse(message)) return
    const entry = pending.get(Number(message.id))
    if (!entry) return
    pending.delete(Number(message.id))
    if (isError(message)) {
      entry.reject(new Error(`MCP error ${message.error.code}: ${message.error.message}`))
    } else {
      entry.resolve(message.result)
    }
  })

  const call = <T>(method: string, params?: Record<string, unknown>): Promise<T> => {
    const id = nextId++
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: v => resolve(v as T), reject })
      Promise.resolve(
        options.transport.send({ jsonrpc: '2.0', id, method, params }),
      ).catch(err => {
        pending.delete(id)
        reject(err instanceof Error ? err : new Error(String(err)))
      })
    })
  }

  return {
    async initialize() {
      return call<{ serverInfo: { name: string; version?: string } }>('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: options.clientInfo ?? { name: 'agentskit-mcp-client', version: '0.1.0' },
      })
    },
    async listTools() {
      return call<McpToolsListResult>('tools/list')
    },
    async callTool(name, args) {
      return call<McpCallToolResult>('tools/call', { name, arguments: args })
    },
    async close() {
      detach()
      await options.transport.close?.()
    },
  }
}

/**
 * Hydrate the tools advertised by an MCP server into AgentsKit
 * `ToolDefinition`s. Each call delegates to `client.callTool` and
 * flattens the text content into a single string result.
 */
export async function toolsFromMcpClient(client: McpClient): Promise<ToolDefinition[]> {
  const { tools } = await client.listTools()
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    schema: t.inputSchema,
    async execute(args) {
      const result = await client.callTool(t.name, args)
      const text = result.content
        .map(c => (c.type === 'text' ? c.text : ''))
        .filter(Boolean)
        .join('\n')
      if (result.isError) throw new Error(text || `MCP tool ${t.name} errored`)
      return text
    },
  }))
}
