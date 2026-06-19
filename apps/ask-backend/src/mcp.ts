/**
 * MCP endpoint for the central Ask backend (RFC-0007 F3).
 *
 * A hand-rolled JSON-RPC 2.0 server over POST (streamable-http), mirroring the
 * registry MCP (`apps/registry/app/api/mcp`) so agents query AgentsKit knowledge
 * with the same transport. Read-only and public over the shared corpus registry.
 *
 * This file is just the transport + protocol dispatch; the wire primitives live in
 * `mcp/jsonrpc`, the tools (`list_corpora` / `search_docs` / `ask`) in `mcp/tools`,
 * and the non-streaming answer collapse in `mcp/ask-once`.
 */
import {
  MCP_CORS,
  RPC_ERRORS,
  rpcError,
  rpcResult,
  toolError,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type ToolResult,
} from './mcp/jsonrpc'
import { TOOL_DEFINITIONS, runTool, type McpCorpus, type ToolContext } from './mcp/tools'

export type { McpCorpus } from './mcp/tools'

export interface McpOptions {
  /** Rate-limit the raw `search_docs` tool per client IP. */
  searchLimiter?: ToolContext['searchLimiter']
}

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'agentskit-ask', version: '1.0.0' } as const

/** Spoof-resistant client IP (see server.ts `clientIp` — rightmost XFF / x-real-ip). */
function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]!
  }
  return 'unknown'
}

/** The `GET /mcp` descriptor (what the endpoint is + which tools it offers). */
function descriptor(): Response {
  return Response.json(
    {
      name: 'AgentsKit Ask MCP',
      transport: 'streamable-http (JSON-RPC over POST)',
      tools: TOOL_DEFINITIONS.map((t) => t.name),
    },
    { headers: MCP_CORS },
  )
}

/** Build the MCP request handler over the given corpus registry. */
export function createMcpHandler(corpora: Record<string, McpCorpus>, opts: McpOptions = {}) {
  /** Run a tool, converting a thrown error into a tool-level error result. */
  async function callTool(name: string, args: Record<string, unknown>, ip: string): Promise<ToolResult> {
    const ctx: ToolContext = { corpora, ip, searchLimiter: opts.searchLimiter }
    try {
      return await runTool(name, args, ctx)
    } catch (e) {
      return toolError(e instanceof Error ? e.message : String(e))
    }
  }

  /** Dispatch one JSON-RPC message. Returns `null` for notifications (no reply). */
  async function dispatch(msg: JsonRpcRequest, ip: string): Promise<JsonRpcResponse | null> {
    const { id, method, params } = msg ?? {}
    switch (method) {
      case 'initialize':
        return rpcResult(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO })
      case 'ping':
        return rpcResult(id, {})
      case 'tools/list':
        return rpcResult(id, { tools: TOOL_DEFINITIONS })
      case 'tools/call':
        return rpcResult(id, await callTool(params?.name ?? '', params?.arguments ?? {}, ip))
      default:
        // Notifications are fire-and-forget; everything else is unknown.
        if (typeof method === 'string' && method.startsWith('notifications/')) return null
        return rpcError(id, RPC_ERRORS.methodNotFound, `Method not found: ${method}`)
    }
  }

  return async function mcp(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: MCP_CORS })
    if (req.method === 'GET') return descriptor()

    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return Response.json(rpcError(null, RPC_ERRORS.parse, 'Parse error'), { status: 400, headers: MCP_CORS })
    }

    // JSON-RPC supports batches (array) and single messages.
    const ip = clientIp(req)
    const out = Array.isArray(payload)
      ? (await Promise.all(payload.map((m) => dispatch(m as JsonRpcRequest, ip)))).filter(Boolean)
      : await dispatch(payload as JsonRpcRequest, ip)

    // Nothing to reply (e.g. a batch of only notifications) → 202 Accepted.
    if (out == null || (Array.isArray(out) && out.length === 0)) {
      return new Response(null, { status: 202, headers: MCP_CORS })
    }
    return Response.json(out, { headers: MCP_CORS })
  }
}
