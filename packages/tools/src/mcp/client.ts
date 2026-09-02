import { ConfigError, ErrorCodes, ToolError } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'
import type {
  JsonRpcMessage,
  JsonRpcSuccess,
  JsonRpcError,
  McpCallToolResult,
  McpToolsListResult,
  McpTransport,
} from './types'
import { MCP_PROTOCOL_VERSION } from './types'

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

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_MAX_PENDING = 256

function asToolError(error: unknown): ToolError {
  if (error instanceof ToolError) return error
  return new ToolError({
    code: ErrorCodes.AK_TOOL_EXEC_FAILED,
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  })
}

/**
 * Build an MCP client over any `McpTransport`. Supports
 * `initialize`, `tools/list`, and `tools/call` — the minimum needed
 * to drive external MCP servers as AgentsKit tools.
 *
 * Requests are bounded:
 *  - each call rejects after `requestTimeoutMs` (default 30s) so a
 *    silent server cannot leak entries into `pending` forever
 *  - `maxPending` caps concurrent in-flight requests so the map cannot
 *    grow without bound on a runaway producer
 */
export function createMcpClient(options: {
  transport: McpTransport
  clientInfo?: { name: string; version: string }
  /** Per-request timeout in ms. Default 30000. */
  requestTimeoutMs?: number
  /** Max concurrent in-flight requests. Default 256. */
  maxPending?: number
}): McpClient {
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  const maxPending = options.maxPending ?? DEFAULT_MAX_PENDING
  if (!Number.isSafeInteger(requestTimeoutMs) || requestTimeoutMs < 1) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'requestTimeoutMs must be a positive safe integer' })
  }
  if (!Number.isSafeInteger(maxPending) || maxPending < 1) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: 'maxPending must be a positive safe integer' })
  }
  interface PendingEntry {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
  const pending = new Map<number, PendingEntry>()
  let nextId = 1
  let closed = false

  const settle = (id: number, ok: boolean, value: unknown): void => {
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    clearTimeout(entry.timer)
    if (ok) entry.resolve(value)
    else entry.reject(value as Error)
  }

  const detach = options.transport.onMessage(message => {
    if (!isResponse(message)) return
    const id = Number(message.id)
    if (isError(message)) {
      settle(id, false, new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `MCP error ${message.error.code}: ${message.error.message}`,
      }))
    } else {
      settle(id, true, message.result)
    }
  })
  const detachClose = options.transport.onClose?.(() => {
    for (const id of pending.keys()) {
      settle(id, false, new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'MCP transport closed' }))
    }
  })

  const call = <T>(method: string, params?: Record<string, unknown>): Promise<T> => {
    if (closed) return Promise.reject(new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'MCP client closed' }))
    if (pending.size >= maxPending) {
      return Promise.reject(new ToolError({
        code: ErrorCodes.AK_TOOL_QUOTA_EXCEEDED,
        message: `MCP client: maxPending (${maxPending}) exceeded`,
      }))
    }
    const id = nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        settle(id, false, new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `MCP request timeout after ${requestTimeoutMs}ms: ${method}`,
        }))
      }, requestTimeoutMs)
      pending.set(id, {
        resolve: v => resolve(v as T),
        reject,
        timer,
      })
      try {
        Promise.resolve(options.transport.send({ jsonrpc: '2.0', id, method, params })).catch(err => {
          settle(id, false, asToolError(err))
        })
      } catch (err) {
        settle(id, false, asToolError(err))
      }
    })
  }

  return {
    async initialize() {
      const result = await call<{ protocolVersion?: unknown; serverInfo: { name: string; version?: string } }>('initialize', {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        clientInfo: options.clientInfo ?? { name: 'agentskit-mcp-client', version: '0.1.0' },
      })
      if (result.protocolVersion !== MCP_PROTOCOL_VERSION) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'unsupported MCP protocol version',
        })
      }
      return result
    },
    async listTools() {
      return call<McpToolsListResult>('tools/list')
    },
    async callTool(name, args) {
      return call<McpCallToolResult>('tools/call', { name, arguments: args })
    },
    async close() {
      if (closed) return
      closed = true
      detach()
      detachClose?.()
      for (const [id, entry] of pending) {
        clearTimeout(entry.timer)
        entry.reject(new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'MCP client closed' }))
        pending.delete(id)
      }
      await options.transport.close?.()
    },
  }
}

export interface ToolsFromMcpOptions {
  /**
   * Maximum byte length permitted for each tool's `description`.
   * Anything longer is truncated. The description ends up inside the
   * LLM prompt, so a malicious or buggy MCP server could otherwise
   * inject arbitrarily large or prompt-poisoning text. Default 4096.
   */
  maxDescriptionBytes?: number
  /**
   * Maximum byte length permitted for each tool's `inputSchema` once
   * serialized to JSON. Tools whose schema exceeds the cap are dropped
   * (since a partially-truncated schema is worse than no schema).
   * Default 65536.
   */
  maxSchemaBytes?: number
  /**
   * Treat the remote server as untrusted: prefix tool names with
   * `mcp:` to make their origin obvious in the agent's tool registry
   * and quarantine logs, and prepend a provenance hint to descriptions.
   * Default true — opt out only for first-party MCP servers you operate.
   */
  quarantine?: boolean
  /** Receives a safe reason when a remote descriptor is rejected. */
  onInvalidTool?: (reason: string) => void
}

const DEFAULT_MAX_DESCRIPTION_BYTES = 4096
const DEFAULT_MAX_SCHEMA_BYTES = 65_536

function truncateBytes(input: string, max: number): string {
  const bytes = (value: string) => new TextEncoder().encode(value).byteLength
  const take = (value: string, limit: number): string => {
    let out = ''
    for (const char of value) {
      const next = out + char
      if (bytes(next) > limit) break
      out = next
    }
    return out
  }
  if (bytes(input) <= max) return input
  const suffix = '…[truncated]'
  if (max <= bytes(suffix)) return take(suffix, max)
  return `${take(input, max - bytes(suffix))}${suffix}`
}

/**
 * Hydrate the tools advertised by an MCP server into AgentsKit
 * `ToolDefinition`s. Each call delegates to `client.callTool` and
 * flattens the text content into a single string result.
 *
 * Server-provided metadata is treated as untrusted input:
 *  - `description` is capped at `maxDescriptionBytes` (default 4 KB) so
 *    a malicious server cannot smuggle a giant prompt-injection
 *    payload into the agent's system context
 *  - `inputSchema` whose JSON exceeds `maxSchemaBytes` (default 64 KB)
 *    is dropped — partial schemas would silently break tool calls
 *  - when `quarantine` (default `true`) the tool name is prefixed with
 *    `mcp:` and the description carries a provenance hint, so the
 *    agent and audit logs can tell origin tools from native ones
 */
export async function toolsFromMcpClient(
  client: McpClient,
  options: ToolsFromMcpOptions = {},
): Promise<ToolDefinition[]> {
  const maxDescription = limit(options.maxDescriptionBytes, DEFAULT_MAX_DESCRIPTION_BYTES, 'maxDescriptionBytes')
  const maxSchema = limit(options.maxSchemaBytes, DEFAULT_MAX_SCHEMA_BYTES, 'maxSchemaBytes')
  const quarantine = options.quarantine ?? true
  const onInvalidTool = options.onInvalidTool
  const listed = await client.listTools()
  if (!isRecord(listed) || !Array.isArray(listed.tools)) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'MCP tools/list returned an invalid tool list' })
  }
  const { tools } = listed
  const out: ToolDefinition[] = []
  const names = new Set<string>()
  for (const t of tools) {
    if (!isRecord(t)) {
      const reason = 'remote MCP tool descriptor must be an object'
      onInvalidTool?.(reason)
      throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: reason })
    }
    if (!isValidToolName(t?.name)) {
      const reason = 'remote MCP tool has an invalid name'
      onInvalidTool?.(reason)
      throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: reason })
    }
    const name = quarantine ? `mcp.${t.name}` : t.name
    if (new TextEncoder().encode(name).byteLength > 128 || names.has(name)) {
      const reason = 'remote MCP tool names must be unique and fit the AgentsKit limit'
      onInvalidTool?.(reason)
      throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: reason })
    }
    if (!isRecord(t.inputSchema)) {
      const reason = 'remote MCP tool schema must be an object'
      onInvalidTool?.(reason)
      throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: reason })
    }
    const schemaJson = JSON.stringify(t.inputSchema)
    if (new TextEncoder().encode(schemaJson).byteLength > maxSchema) {
      // Drop oversized schema; safer than passing a truncated copy.
      continue
    }
    if (t.description !== undefined && typeof t.description !== 'string') {
      const reason = 'remote MCP tool description must be a string'
      onInvalidTool?.(reason)
      throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: reason })
    }
    const prefix = quarantine ? '[mcp] ' : ''
    const description = truncateBytes(`${prefix}${t.description ?? ''}`, maxDescription)
    names.add(name)
    out.push({
      name,
      description,
      schema: t.inputSchema,
      async execute(args) {
        const result = await client.callTool(t.name, args)
        if (!isRecord(result) || !Array.isArray(result.content) ||
          !result.content.every(c => isRecord(c) && c.type === 'text' && typeof c.text === 'string')) {
          throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `MCP tool ${t.name} returned invalid content` })
        }
        const text = result.content
          .map(c => (c as { type: 'text'; text: string }).text)
          .filter(Boolean)
          .join('\n')
        if (result.isError) {
          throw new ToolError({
            code: ErrorCodes.AK_TOOL_EXEC_FAILED,
            message: text || `MCP tool ${t.name} errored`,
          })
        }
        return text
      },
    })
  }
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isValidToolName(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(value)
}

function limit(value: number | undefined, fallback: number, field: string): number {
  const result = value ?? fallback
  if (!Number.isSafeInteger(result) || result < 1) {
    throw new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message: `${field} must be a positive safe integer` })
  }
  return result
}
