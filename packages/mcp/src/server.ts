import {
  ConfigError,
  ErrorCodes,
  isRecord,
  ToolError,
  type ArgsValidator,
  type ToolDefinition,
  type ToolExecutionContext,
} from '@agentskit/core'
import { createAjvValidator } from '@agentskit/tools/validation'
import {
  type JsonRpcMessage,
  type McpToolDefinition as BaseMcpToolDefinition,
  type McpTransport,
  type StdioLikeProcess,
} from '@agentskit/tools/mcp'
import { McpServer as SdkMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js'
import type { Transport as SdkTransport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { assertNonEmptyString, assertToolName } from './validation'

/** Verified caller identity attached to an MCP tool invocation. */
export interface McpAuthIdentity {
  /** Stable subject (for example the OAuth `sub` claim). */
  subject: string
  /** Granted scopes, when the token carries them. */
  scopes?: string[]
  /** Additional claims made available to tool handlers. */
  claims?: Record<string, unknown>
}

/** Execution context for MCP-backed tools, including the verified identity. */
export interface McpToolExecutionContext extends ToolExecutionContext {
  auth?: McpAuthIdentity
}

/** A resource exposed over MCP, including MCP Apps `ui://` documents. */
export interface McpResourceDefinition {
  uri: string
  name: string
  description?: string
  mimeType?: string
  /** Static body served for `resources/read`. */
  text?: string
  /** Dynamic body served for `resources/read`; takes precedence over `text`. */
  read?: () => string | Promise<string>
}

/** Tool metadata understood by MCP Apps hosts. */
export interface McpAppLink {
  resourceUri: string
}

/** AgentsKit tool plus the optional metadata MCP hosts display. */
export interface McpToolDefinition extends BaseMcpToolDefinition {
  /** Raw `_meta` advertised with the tool descriptor. */
  _meta?: Record<string, unknown>
  /** Shorthand for `_meta.ui.resourceUri`. */
  app?: McpAppLink
}

/** Observability events emitted by the server. Logs must never go to stdout. */
export interface McpServerEvent {
  type: 'call' | 'error' | 'list'
  tool?: string
  error?: string
}

/** Transport, tools, and policy hooks used to create an MCP server. */
export interface McpServerOptions {
  tools: McpToolDefinition[]
  resources?: McpResourceDefinition[]
  /** Omit to create an unconnected server (for example for Streamable HTTP). */
  transport?: McpTransport
  serverInfo?: { name: string; version: string }
  /** Observability hook. */
  onEvent?: (event: McpServerEvent) => void
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

export interface McpServerDefinition {
  tools: McpToolDefinition[]
  resources: McpResourceDefinition[]
  serverInfo: { name: string; version: string }
  onEvent?: (event: McpServerEvent) => void
  authorizeToolCall?: McpServerOptions['authorizeToolCall']
  validateArgs: ArgsValidator
  exposeErrors: boolean
}

export interface ProtocolServer {
  sdk: SdkMcpServer
  connect: (transport: McpTransport) => Promise<void>
  connectSdk: (transport: SdkTransport) => Promise<void>
  close: () => Promise<void>
}

const EMPTY_ARGS_SCHEMA = {
  type: 'object' as const,
  properties: {},
  additionalProperties: false,
}

const definitions = new WeakMap<McpServer, McpServerDefinition>()

const invalid = (message: string): ConfigError =>
  new ConfigError({ code: ErrorCodes.AK_CONFIG_INVALID, message })

/** Adapt the current Node process to the `StdioLikeProcess` the transport expects. */
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

/** Create an MCP server on the official SDK. Omit `transport` for a definition-only server. */
export function createMcpServer(options: McpServerOptions): McpServer {
  const normalized = normalizeServerOptions(options)
  const protocol = createProtocolServer(normalized)
  const handle: McpServer = {
    async close() {
      await protocol.close()
    },
  }
  definitions.set(handle, normalized)

  if (options.transport) {
    void protocol.connect(options.transport).catch(() => undefined)
  }

  return handle
}

/** @internal Expose the normalized definition so the HTTP handler can build independent servers. */
export function definitionFor(server: McpServer): McpServerDefinition {
  const definition = definitions.get(server)
  if (!definition) {
    throw invalid('server was not created by createMcpServer')
  }
  return definition
}

/** @internal Build a fresh SDK server from a normalized definition. */
export function createProtocolServer(options: McpServerDefinition): ProtocolServer {
  const sdk = new SdkMcpServer(options.serverInfo, {
    capabilities: {
      tools: { listChanged: false },
      ...(options.resources.length === 0
        ? {}
        : { resources: { listChanged: false, subscribe: false } }),
    },
  })

  sdk.server.setRequestHandler(ListToolsRequestSchema, () => {
    options.onEvent?.({ type: 'list' })
    return {
      tools: options.tools.map((tool) => {
        const meta = toolMeta(tool)
        return {
          name: tool.name,
          ...(tool.title === undefined ? {} : { title: tool.title }),
          ...(tool.description === undefined ? {} : { description: tool.description }),
          inputSchema: tool.schema ?? EMPTY_ARGS_SCHEMA,
          ...(tool.annotations === undefined ? {} : { annotations: tool.annotations }),
          ...(meta === undefined ? {} : { _meta: meta }),
        }
      }),
    }
  })

  sdk.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: rawArgs } = request.params
    const tool = options.tools.find((candidate) => candidate.name === name)
    if (!tool || typeof tool.execute !== 'function') {
      options.onEvent?.({ type: 'error', tool: name, error: 'unknown tool' })
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_INVALID_INPUT,
        message: `unknown tool: ${name}`,
      })
    }

    options.onEvent?.({ type: 'call', tool: tool.name })
    try {
      const args = (rawArgs ?? {}) as Record<string, unknown>
      const validation = options.validateArgs(tool.schema ?? EMPTY_ARGS_SCHEMA, args)
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

      const auth = authFromExtra(extra.authInfo)
      const context: McpToolExecutionContext = {
        messages: [],
        call: { id: String(extra.requestId), name: tool.name, args, status: 'running' },
        ...(auth === undefined ? {} : { auth }),
      }
      const result = await tool.execute(args, context)
      const serialized = typeof result === 'string' ? result : JSON.stringify(result)
      return { content: [{ type: 'text' as const, text: serialized === undefined ? '' : serialized }] }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      options.onEvent?.({ type: 'error', tool: tool.name, error: 'tool execution failed' })
      return {
        content: [{ type: 'text' as const, text: options.exposeErrors ? message : 'tool execution failed' }],
        isError: true,
      }
    }
  })

  if (options.resources.length > 0) {
    sdk.server.setRequestHandler(ListResourcesRequestSchema, () => ({
      resources: options.resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        ...(resource.description === undefined ? {} : { description: resource.description }),
        ...(resource.mimeType === undefined ? {} : { mimeType: resource.mimeType }),
      })),
    }))

    sdk.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = options.resources.find((candidate) => candidate.uri === request.params.uri)
      if (!resource) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `unknown resource: ${request.params.uri}`,
        })
      }
      const text = resource.read ? await resource.read() : resource.text ?? ''
      return {
        contents: [{
          uri: resource.uri,
          ...(resource.mimeType === undefined ? {} : { mimeType: resource.mimeType }),
          text,
        }],
      }
    })
  }

  return {
    sdk,
    async connect(transport) {
      await sdk.connect(createSdkTransport(transport))
    },
    async connectSdk(transport) {
      await sdk.connect(transport)
    },
    async close() {
      await sdk.close()
    },
  }
}

function toolMeta(tool: McpToolDefinition): Record<string, unknown> | undefined {
  if (tool.app === undefined) return tool._meta
  const ui = isRecord(tool._meta?.ui) ? tool._meta.ui : {}
  return { ...tool._meta, ui: { ...ui, resourceUri: tool.app.resourceUri } }
}

function authFromExtra(
  authInfo: { clientId: string; scopes: string[]; extra?: Record<string, unknown> } | undefined,
): McpAuthIdentity | undefined {
  if (!authInfo) return undefined
  const subject = typeof authInfo.extra?.subject === 'string' ? authInfo.extra.subject : authInfo.clientId
  const claims = isRecord(authInfo.extra?.claims) ? authInfo.extra.claims : undefined
  return {
    subject,
    ...(authInfo.scopes.length === 0 ? {} : { scopes: authInfo.scopes }),
    ...(claims === undefined ? {} : { claims }),
  }
}

function createSdkTransport(transport: McpTransport): SdkTransport {
  let detach: (() => void) | undefined
  let detachClose: (() => void) | undefined
  const bridge: SdkTransport = {
    async start() {
      detach = transport.onMessage((message) => {
        bridge.onmessage?.(message as unknown as JSONRPCMessage)
      })
      detachClose = transport.onClose?.(() => bridge.onclose?.())
    },
    async send(message) {
      await transport.send(message as unknown as JsonRpcMessage)
    },
    async close() {
      detach?.()
      detachClose?.()
      await transport.close?.()
    },
  }
  return bridge
}

export function normalizeServerOptions(options: McpServerOptions): McpServerDefinition {
  if (!isRecord(options) || !Array.isArray(options.tools)) {
    throw invalid('MCP server options must include a tools array')
  }

  const names = new Set<string>()
  const tools = options.tools.map((tool, index) => {
    if (!isRecord(tool)) {
      throw invalid(`tools[${index}] must be a tool definition`)
    }
    const name = assertToolName(tool.name, `tools[${index}].name`)
    if (names.has(name)) {
      throw invalid(`tool names must be unique; duplicate "${name}"`)
    }
    names.add(name)
    return Object.freeze({ ...tool, name }) as McpToolDefinition
  })

  const resources = (options.resources ?? []).map((resource, index) => {
    if (!isRecord(resource)) {
      throw invalid(`resources[${index}] must be a resource definition`)
    }
    assertNonEmptyString(resource.uri, `resources[${index}].uri`, 2_048)
    assertNonEmptyString(resource.name, `resources[${index}].name`, 128)
    if (resource.read !== undefined && typeof resource.read !== 'function') {
      throw invalid(`resources[${index}].read must be a function`)
    }
    if (resource.text !== undefined && typeof resource.text !== 'string') {
      throw invalid(`resources[${index}].text must be a string`)
    }
    return Object.freeze({ ...resource })
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
    throw invalid('transport must implement send and onMessage')
  }

  const onEvent = options.onEvent === undefined
    ? undefined
    : (event: McpServerEvent): void => {
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

  return {
    tools,
    resources,
    serverInfo,
    onEvent,
    authorizeToolCall: options.authorizeToolCall,
    validateArgs: options.validateArgs ?? createAjvValidator(),
    exposeErrors: options.exposeErrors ?? false,
  }
}
