import type { MaybePromise } from './common'
import type { StreamStatus } from './stream'
import type { Message } from './message'
import type { ToolCall, ToolCallHandlerContext, ToolDefinition } from './tool'
import type { AdapterFactory } from './adapter'
import type { ChatMemory } from './memory'
import type { Retriever } from './retrieval'
import type { SkillDefinition } from './skill'
import type { Observer } from './agent'

export interface ChatConfig {
  adapter: AdapterFactory
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  skills?: SkillDefinition[]
  memory?: ChatMemory
  retriever?: Retriever
  initialMessages?: Message[]
  /**
   * Maximum number of LLM ↔ tool feedback turns per `send()`.
   * After a tool call, the controller feeds the result back to the model
   * so it can continue reasoning. This caps that loop to prevent runaway
   * cost if a model keeps requesting tools. Default: 5. Set to 1 to disable.
   */
  maxToolIterations?: number
  onMessage?: (message: Message) => void
  onError?: (error: Error) => void
  onToolCall?: (toolCall: ToolCall, context: ToolCallHandlerContext) => MaybePromise<void>
  observers?: Observer[]
}

export interface ChatState {
  messages: Message[]
  status: StreamStatus
  input: string
  error: Error | null
}

export interface EditOptions {
  /**
   * When editing a user message, also regenerate the assistant response
   * that followed it (truncating any later turns). Default: true.
   */
  regenerate?: boolean
}

export interface ChatController {
  getState: () => ChatState
  subscribe: (listener: () => void) => () => void
  send: (text: string) => Promise<void>
  stop: () => void
  retry: () => Promise<void>
  /**
   * Edit a message by id. For user messages, truncates all subsequent
   * turns and regenerates (unless opts.regenerate === false).
   * For assistant messages, updates the content in place.
   */
  edit: (messageId: string, newContent: string, opts?: EditOptions) => Promise<void>
  /**
   * Regenerate the assistant response. If `messageId` names an assistant
   * message, that one is replaced. Otherwise regenerates the last
   * assistant turn (same as retry()).
   */
  regenerate: (messageId?: string) => Promise<void>
  setInput: (value: string) => void
  setMessages: (messages: Message[]) => void
  clear: () => Promise<void>
  updateConfig: (config: Partial<ChatConfig>) => void
  approve: (toolCallId: string) => Promise<void>
  deny: (toolCallId: string, reason?: string) => Promise<void>
}

export interface ChatReturn extends ChatState {
  send: (text: string) => Promise<void>
  stop: () => void
  retry: () => Promise<void>
  edit: (messageId: string, newContent: string, opts?: EditOptions) => Promise<void>
  regenerate: (messageId?: string) => Promise<void>
  setInput: (value: string) => void
  clear: () => Promise<void>
  approve: (toolCallId: string) => Promise<void>
  deny: (toolCallId: string, reason?: string) => Promise<void>
}
