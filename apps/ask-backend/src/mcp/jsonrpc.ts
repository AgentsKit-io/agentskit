/**
 * JSON-RPC 2.0 primitives for the MCP endpoint — the wire layer, decoupled from
 * the tools. Keeping these here means the request handler reads as protocol logic
 * and the tools never touch envelope shapes.
 */

/** The JSON-RPC / MCP error codes we emit. */
export const RPC_ERRORS = {
  parse: -32700,
  methodNotFound: -32601,
} as const

export type JsonRpcId = string | number | null

export interface JsonRpcRequest {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: { name?: string; arguments?: Record<string, unknown> }
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string }
}

/** An MCP `tools/call` result (the content envelope clients expect). */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export function rpcResult(id: JsonRpcId | undefined, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

export function rpcError(id: JsonRpcId | undefined, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

/** Wrap a value as a successful MCP text result (JSON unless already a string). */
export function toolText(value: unknown): ToolResult {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return { content: [{ type: 'text', text }] }
}

/** An MCP tool-level error (distinct from a protocol error — the call succeeded). */
export function toolError(message: string): ToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] }
}

/**
 * CORS for the public, read-only MCP surface. `*` is intentional: no auth, no
 * cookies, public docs knowledge — open CORS leaks nothing a direct request
 * wouldn't, and abuse is bounded by the per-IP rate-limit (same as the registry MCP).
 */
export const MCP_CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-protocol-version',
} as const
