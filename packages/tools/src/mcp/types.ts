import type { JSONSchema7 } from 'json-schema'

/**
 * Subset of the Model Context Protocol (MCP) used by the bridge.
 * Full MCP spec covers resources, prompts, sampling, and more —
 * this module focuses on the most common case: tools.
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcSuccess<TResult = unknown> {
  jsonrpc: '2.0'
  id: number | string
  result: TResult
}

export interface JsonRpcError {
  jsonrpc: '2.0'
  id: number | string | null
  error: { code: number; message: string; data?: unknown }
}

export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcError

export interface McpToolDescriptor {
  name: string
  description?: string
  inputSchema: JSONSchema7
}

export interface McpToolsListResult {
  tools: McpToolDescriptor[]
}

export interface McpContentText {
  type: 'text'
  text: string
}

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
