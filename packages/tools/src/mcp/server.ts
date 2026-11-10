import { ErrorCodes, isRecord, ToolError } from '@agentskit/core'
import type { ArgsValidator, ToolDefinition } from '@agentskit/core'
import type { JSONSchema7 } from 'json-schema'
import type {
  JsonRpcMessage,
  JsonRpcRequest,
  McpTransport,
  McpToolDefinition,
} from './types'
import { MCP_PROTOCOL_VERSION } from './types'
import { createAjvValidator } from '../../../validation/src/ajv-validator'

/** Transport, tools, and policy hooks used to create an MCP server. */
export interface McpServerOptions {
  transport: McpTransport
  tools: McpToolDefinition[]
  serverInfo?: { name: string; version: string }
  /** Observability hook. */
  onEvent?: (event: { type: 'call' | 'error' | 'list'; tool?: string; error?: string }) => void
  /** Required for tools marked `requiresConfirmation`. Deny by default. */
  authorizeToolCall?: (tool: ToolDefinition, args: Record<string, unknown>) => boolean | Promise<boolean>
  /** Override the default Ajv argument validator. */
  validateArgs?: ArgsValidator
  /** Include raw tool errors in MCP responses. Defaults to false. */
  exposeErrors?: boolean
}

/** Handle for closing a running MCP server. */
export interface McpServer {
  close: () => Promise<void>
}

/** Expose AgentsKit tools over an MCP transport using initialize, tools/list, and tools/call.
 * @example
 * const server = createMcpServer({ transport, tools })

 *
 * @param options Transport, tools, and optional authorization and validation hooks.
 * @returns A handle for closing the server. */
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

  const validateArgs = options.validateArgs ?? createAjvValidator()
  const detach = transport.onMessage(async raw => {
    if (!isRecord(raw) || raw.jsonrpc !== '2.0' || typeof raw.method !== 'string') {
      await respond({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'invalid request' } })
      return
    }
    const request = raw as JsonRpcRequest
    const hasId = 'id' in request
    if (hasId && !isValidId(request.id)) {
      await respond({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'invalid request' } })
      return
    }
    if ('params' in request && request.params !== undefined && !isRecord(request.params)) {
      if (hasId) await respond({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'invalid params' } })
      return
    }

    try {
      if (request.method === 'initialize') {
        if (!hasId) return
        const requestedVersion = request.params?.protocolVersion
        if (requestedVersion !== MCP_PROTOCOL_VERSION) {
          await respond({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32602, message: `unsupported protocol version; supported: ${MCP_PROTOCOL_VERSION}` },
          })
          return
        }
        await respond({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
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
              ...(t.title === undefined ? {} : { title: t.title }),
              ...(t.annotations === undefined ? {} : { annotations: t.annotations }),
              description: t.description,
              inputSchema: t.schema ?? EMPTY_ARGS_SCHEMA,
            })),
          },
        })
        return
      }

      if (request.method === 'tools/call') {
        if (!hasId) return
        const params = request.params as { name?: unknown; arguments?: unknown } | undefined
        if (typeof params?.name !== 'string' || (params.arguments !== undefined && !isRecord(params.arguments))) {
          await respond({ jsonrpc: '2.0', id: request.id, error: { code: -32602, message: 'invalid params' } })
          return
        }
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
          const args = (params.arguments ?? {}) as Record<string, unknown>
          const validation = validateArgs(tool.schema ?? EMPTY_ARGS_SCHEMA, args)
          if (!validation.valid) {
            throw new ToolError({
              code: ErrorCodes.AK_TOOL_INVALID_INPUT,
              message: validation.message ?? 'invalid tool arguments',
            })
          }
          if (tool.requiresConfirmation) {
            if (!options.authorizeToolCall || !(await options.authorizeToolCall(tool, args))) {
              throw new ToolError({ code: ErrorCodes.AK_TOOL_FORBIDDEN, message: 'confirmation required' })
            }
          }
          const result = await tool.execute(args, {
            messages: [],
            call: { id: String(request.id), name: tool.name, args, status: 'running' },
          })
          const serialized = typeof result === 'string' ? result : JSON.stringify(result)
          const text = serialized === undefined ? '' : serialized
          await respond({
            jsonrpc: '2.0',
            id: request.id,
            result: { content: [{ type: 'text', text }] },
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          options.onEvent?.({ type: 'error', tool: tool.name, error: 'tool execution failed' })
          await respond({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [{ type: 'text', text: options.exposeErrors ? message : 'tool execution failed' }],
              isError: true,
            },
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
            message: 'MCP request failed',
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

const EMPTY_ARGS_SCHEMA: JSONSchema7 = {
  type: 'object',
  properties: {},
  additionalProperties: false,
}

function isValidId(value: unknown): value is string | number {
  return (typeof value === 'string' && value.length > 0) ||
    (typeof value === 'number' && Number.isFinite(value))
}
