import type { ToolDefinition } from '@agentskit/core'
import type { McpServerSpec } from '../plugins/types'
import { McpClient, type McpTool } from './client'

export interface McpBridgeResult {
  clients: McpClient[]
  tools: ToolDefinition[]
}

/**
 * Start every MCP server in `specs`, call `tools/list`, and produce a
 * `ToolDefinition[]` whose `execute` forwards to the server via
 * `tools/call`. Returns the live clients so the caller can dispose them
 * on session end.
 */
export async function bridgeMcpServers(specs: McpServerSpec[]): Promise<McpBridgeResult> {
  const clients: McpClient[] = []
  const tools: ToolDefinition[] = []

  for (const spec of specs) {
    const client = new McpClient(spec)
    try {
      await client.start()
      const mcpTools = await client.listTools()
      for (const mcpTool of mcpTools) {
        tools.push(mcpToolToDefinition(spec.name, client, mcpTool))
      }
      clients.push(client)
    } catch (err) {
      process.stderr.write(
        `[agentskit] mcp server "${spec.name}" failed: ${err instanceof Error ? err.message : String(err)}\n`,
      )
      client.dispose()
    }
  }

  return { clients, tools }
}

function mcpToolToDefinition(
  serverName: string,
  client: McpClient,
  tool: McpTool,
): ToolDefinition {
  return {
    name: `${serverName}__${tool.name}`,
    description: tool.description ?? `MCP tool ${tool.name} from ${serverName}`,
    schema: (tool.inputSchema ?? { type: 'object', properties: {} }) as never,
    execute: async (args) => {
      return await client.callTool(tool.name, args)
    },
  }
}

export function disposeMcpClients(clients: McpClient[]): void {
  for (const client of clients) client.dispose()
}
