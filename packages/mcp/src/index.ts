import type { ToolDefinition } from '@agentskit/core'
import {
  createMcpServer,
  createStdioTransport,
  type McpServer,
  type McpTransport,
  type StdioLikeProcess,
} from '@agentskit/tools/mcp'

export interface AgentsKitMcpServerOptions {
  /** AgentsKit tools to expose to the MCP host. */
  tools: ToolDefinition[]
  serverInfo?: { name: string; version: string }
  /** Observability hook (call / error / list). Logs must NOT go to stdout — it is the MCP channel. */
  onEvent?: (event: { type: 'call' | 'error' | 'list'; tool?: string; error?: string }) => void
  /**
   * Transport override. Defaults to stdio over the current process (the form
   * Claude Desktop / Cursor / Windsurf launch). Inject a custom transport for tests.
   */
  transport?: McpTransport
}

/**
 * Adapt the current Node process to the `StdioLikeProcess` the transport expects:
 * the server RECEIVES JSON-RPC on stdin and SENDS on stdout.
 */
export function processStdio(): StdioLikeProcess {
  return {
    stdin: { write: (chunk: string) => void process.stdout.write(chunk) },
    stdout: {
      on: (_event: 'data', cb: (chunk: Buffer | string) => void) => void process.stdin.on('data', cb),
      off: (_event: 'data', cb: (chunk: Buffer | string) => void) => void process.stdin.off('data', cb),
    },
    on: (event: 'exit' | 'close', cb: () => void) =>
      void process.on(event === 'close' ? 'beforeExit' : 'exit', cb),
  }
}

/**
 * Expose a set of AgentsKit tools as an MCP server (over stdio by default), so
 * any MCP host — Claude Desktop, Cursor, Windsurf — can call them.
 */
export function createAgentsKitMcpServer(options: AgentsKitMcpServerOptions): McpServer {
  const transport = options.transport ?? createStdioTransport(processStdio())
  return createMcpServer({
    transport,
    tools: options.tools,
    serverInfo: options.serverInfo ?? { name: 'agentskit-mcp', version: '0.1.0' },
    onEvent: options.onEvent,
  })
}

export { createAgentTool, type AgentToolConfig } from './agent-tool'
export { fetchAgentSkill, type FetchedAgentSkill } from './registry-fetch'
export type { McpServer, McpTransport } from '@agentskit/tools/mcp'
