import type { ContentPart } from './content'
import type { ToolCall } from './tool'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'

export interface Message {
  id: string
  role: MessageRole
  /** Text projection of the message. Always populated, even for multi-modal. */
  content: string
  /**
   * Multi-modal parts. When provided, `content` is a text projection
   * of these parts (see `partsToText`). Adapters that support the
   * relevant modality should prefer `parts` over `content`.
   */
  parts?: ContentPart[]
  status: MessageStatus
  toolCalls?: ToolCall[]
  toolCallId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface MemoryRecord {
  version: 1
  messages: Array<Omit<Message, 'createdAt'> & { createdAt: string }>
}
