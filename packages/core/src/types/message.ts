import type { ContentPart } from './content'
import type { ToolCall } from './tool'

/** Role assigned to a message in a conversation. */
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
/** Lifecycle state of a message while it is created or processed. */
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'

/** Conversation message with optional tool calls and multi-modal parts. */
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

/** Versioned JSON-safe representation of messages stored by a memory backend. */
export interface MemoryRecord {
  version: 1
  messages: Array<Omit<Message, 'createdAt'> & { createdAt: string }>
}
