export { createMcpClient, toolsFromMcpClient } from './client'
export type { McpClient } from './client'

export { createMcpServer } from './server'
export type { McpServer, McpServerOptions } from './server'

export {
  createInMemoryTransportPair,
  createStdioTransport,
} from './transports'
export type { StdioLikeProcess } from './transports'

export type {
  McpTransport,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcSuccess,
  JsonRpcError,
  McpToolDescriptor,
  McpToolsListResult,
  McpCallToolResult,
  McpContentText,
} from './types'
