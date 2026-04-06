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

export interface ChatController {
  getState: () => ChatState
  subscribe: (listener: () => void) => () => void
  send: (text: string) => Promise<void>
  stop: () => void
  retry: () => Promise<void>
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
  setInput: (value: string) => void
  clear: () => Promise<void>
  approve: (toolCallId: string) => Promise<void>
  deny: (toolCallId: string, reason?: string) => Promise<void>
}
