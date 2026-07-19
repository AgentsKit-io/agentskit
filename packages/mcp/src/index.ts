import { ConfigError, ErrorCodes, type ToolDefinition } from '@agentskit/core'
import {
  createMcpServer,
  createStdioTransport,
  type McpServer,
  type McpTransport,
  type StdioLikeProcess,
} from '@agentskit/tools/mcp'
import { assertNonEmptyString, assertToolName, isRecord } from './validation'

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
  if (!isRecord(options) || !Array.isArray(options.tools)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'MCP server options must include a tools array',
    })
  }

  const names = new Set<string>()
  const tools = options.tools.map((tool, index) => {
    if (!isRecord(tool)) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `tools[${index}] must be a tool definition`,
      })
    }
    const name = assertToolName(tool.name, `tools[${index}].name`)
    if (names.has(name)) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `tool names must be unique; duplicate "${name}"`,
      })
    }
    names.add(name)
    return Object.freeze({ ...tool, name }) as ToolDefinition
  })

  const serverInfo = options.serverInfo === undefined
    ? { name: 'agentskit-mcp', version: '1.0.0' }
    : {
        name: assertNonEmptyString(options.serverInfo?.name, 'serverInfo.name', 128),
        version: assertNonEmptyString(options.serverInfo?.version, 'serverInfo.version', 64),
      }

  if (
    options.transport !== undefined &&
    (!isRecord(options.transport) ||
      typeof options.transport.send !== 'function' ||
      typeof options.transport.onMessage !== 'function')
  ) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'transport must implement send and onMessage',
    })
  }

  const onEvent = options.onEvent === undefined
    ? undefined
    : (event: Parameters<NonNullable<AgentsKitMcpServerOptions['onEvent']>>[0]): void => {
        try {
          const delivered = (options.onEvent as (value: typeof event) => unknown)(Object.freeze({ ...event }))
          if (delivered !== null && (typeof delivered === 'object' || typeof delivered === 'function')) {
            const then = (delivered as { then?: unknown }).then
            if (typeof then === 'function') void Promise.resolve(delivered).catch(() => undefined)
          }
        } catch {
          // Observation must not alter protocol behavior.
        }
      }

  const transport = options.transport ?? createStdioTransport(processStdio())
  return createMcpServer({
    transport,
    tools,
    serverInfo,
    onEvent,
  })
}

export { createAgentTool, type AgentToolConfig } from './agent-tool'
export {
  fetchAgentSkill,
  type FetchedAgentSkill,
  type FetchAgentSkillOptions,
} from './registry-fetch'
export type { McpServer, McpTransport } from '@agentskit/tools/mcp'
