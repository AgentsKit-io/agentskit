import type { JSONSchema7 } from 'json-schema'
import type { ToolDefinition } from '@agentskit/core'

/** MCP protocol version implemented by the tools bridge. */
export const MCP_PROTOCOL_VERSION = '2024-11-05' as const

/**
 * Subset of the Model Context Protocol (MCP) used by the bridge.
 * Full MCP spec covers resources, prompts, sampling, and more —
 * this module focuses on the most common case: tools.
 */

/** JSON-RPC request message with an identifier and method parameters. */
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

/** JSON-RPC notification message without a response identifier. */
export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

/** Successful JSON-RPC response carrying a result value. */
export interface JsonRpcSuccess<TResult = unknown> {
  jsonrpc: '2.0'
  id: number | string
  result: TResult
}

/** Failed JSON-RPC response carrying an error object. */
export interface JsonRpcError {
  jsonrpc: '2.0'
  id: number | string | null
  error: { code: number; message: string; data?: unknown }
}

/** Request, notification, or response accepted by the MCP transport. */
export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcError

/** Advisory tool behavior hints; never a substitute for authorization. */
export interface McpToolAnnotations {
  title?: string
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

/** Core tool definition with optional MCP display and behavior metadata. */
export interface McpToolDefinition extends ToolDefinition {
  title?: string
  annotations?: McpToolAnnotations
}

/** Tool name, description, and JSON Schema advertised by an MCP server. */
export interface McpToolDescriptor {
  title?: string
  annotations?: McpToolAnnotations
  name: string
  description?: string
  inputSchema: JSONSchema7
}

/** Result payload returned by the MCP `tools/list` method. */
export interface McpToolsListResult {
  tools: McpToolDescriptor[]
}

/** Text content item in the MCP tools result subset. */
export interface McpContentText {
  type: 'text'
  text: string
}

/** Result payload returned by the MCP `tools/call` method. */
export interface McpCallToolResult {
  content: McpContentText[]
  isError?: boolean
}

/**
 * Transport contract. A transport is a bidirectional byte / object
 * pipe — stdio pipes, WebSocket, SSE + POST, whatever. Implementers
 * deliver JSON-RPC messages intact and signal disconnection via
 * `onClose`.
 */
export interface McpTransport {
  send: (message: JsonRpcMessage) => void | Promise<void>
  onMessage: (handler: (message: JsonRpcMessage) => void) => () => void
  onClose?: (handler: () => void) => () => void
  close?: () => void | Promise<void>
}
