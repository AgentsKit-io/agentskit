import type { Message } from './message'
import type { StreamSource } from './stream'
import type { ToolDefinition } from './tool'

export interface AdapterContext {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  metadata?: Record<string, unknown>
}

export interface AdapterRequest {
  messages: Message[]
  context?: AdapterContext
}

export type AdapterFactory = {
  createSource: (request: AdapterRequest) => StreamSource
}
