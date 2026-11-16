import type { ToolDefinition } from '@agentskit/core'
import { createStdioTransport, type McpTransport } from '@agentskit/tools/mcp'
import {
  createMcpServer,
  processStdio,
  type McpResourceDefinition,
  type McpServer,
  type McpServerEvent,
  type McpToolDefinition,
} from './server'

/** Tools, resources, server metadata, transport, and event hook for the stdio MCP bridge. */
export interface AgentsKitMcpServerOptions {
  /** AgentsKit tools to expose to the MCP host. */
  tools: McpToolDefinition[]
  /** Resources exposed over MCP, including `ui://` MCP Apps documents. */
  resources?: McpResourceDefinition[]
  /** Host confirmation hook. Required for tools marked requiresConfirmation; absent means deny. */
  authorizeToolCall?: (tool: ToolDefinition, args: Record<string, unknown>) => boolean | Promise<boolean>
  serverInfo?: { name: string; version: string }
  /** Observability hook (call / error / list). Logs must NOT go to stdout — it is the MCP channel. */
  onEvent?: (event: McpServerEvent) => void
  /**
   * Transport override. Defaults to stdio over the current process (the form
   * Codex / Claude Code / Cursor launch). Inject a custom transport for tests.
   */
  transport?: McpTransport
}

/**
 * Expose a set of AgentsKit tools as an MCP server (over stdio by default), so
 * any MCP host — Codex, Claude Code, Cursor — can call them.
 */
export function createAgentsKitMcpServer(options: AgentsKitMcpServerOptions): McpServer {
  const transport = options?.transport ?? createStdioTransport(processStdio())
  return createMcpServer({ ...options, transport })
}

export { createAgentTool, createTypedAgentTool, type AgentToolConfig, type TypedAgentToolConfig } from './agent-tool'
export {
  fetchAgent,
  fetchAgentSkill,
  type FetchedAgent,
  type FetchedAgentSkill,
  type FetchedTypedAgent,
  type FetchAgentSkillOptions,
} from './registry-fetch'
export { createMcpServer, processStdio } from './server'
export type {
  McpAppLink,
  McpAuthIdentity,
  McpResourceDefinition,
  McpServer,
  McpServerEvent,
  McpServerOptions,
  McpToolDefinition,
  McpToolExecutionContext,
} from './server'
export type { McpTransport } from '@agentskit/tools/mcp'
export { createStreamableHttpHandler } from './http'
export type {
  BearerVerifier,
  ProtectedResourceMetadata,
  StreamableHttpHandler,
  StreamableHttpOptions,
} from './http'
