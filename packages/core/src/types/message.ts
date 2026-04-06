import type { ToolCall } from './tool'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'

export interface Message {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  toolCalls?: ToolCall[]
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface MemoryRecord {
  version: 1
  messages: Array<Omit<Message, 'createdAt'> & { createdAt: string }>
}
