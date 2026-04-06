import type { JSONSchema7 } from 'json-schema'

export type MaybePromise<T> = T | Promise<T>

export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error'

export type ToolCallStatus = 'pending' | 'running' | 'complete' | 'error' | 'requires_confirmation'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  error?: string
  status: ToolCallStatus
}

export interface RetrievedDocument {
  id: string
  content: string
  source?: string
  score?: number
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  role: MessageRole
  content: string
  status: MessageStatus
  toolCalls?: ToolCall[]
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface StreamToolCallPayload {
  id: string
  name: string
  args: string
  result?: string
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'reasoning' | 'error' | 'done'
  content?: string
  toolCall?: StreamToolCallPayload
  metadata?: Record<string, unknown>
}

export interface StreamSource {
  stream: () => AsyncIterableIterator<StreamChunk>
  abort: () => void
}

export interface UseStreamOptions {
  onChunk?: (chunk: StreamChunk) => void
  onComplete?: (text: string) => void
  onError?: (error: Error) => void
}

export interface UseStreamReturn {
  data: StreamChunk | null
  text: string
  status: StreamStatus
  error: Error | null
  stop: () => void
}

export interface ToolExecutionContext {
  messages: Message[]
  call: ToolCall
}

export interface ToolDefinition {
  name: string
  description?: string
  schema?: JSONSchema7
  requiresConfirmation?: boolean
  execute?: (
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => MaybePromise<unknown> | AsyncIterable<unknown>
  init?: () => MaybePromise<void>
  dispose?: () => MaybePromise<void>
  tags?: string[]
  category?: string
}

export interface ToolCallHandlerContext {
  messages: Message[]
  tool?: ToolDefinition
}

export interface ChatMemory {
  load: () => MaybePromise<Message[]>
  save: (messages: Message[]) => MaybePromise<void>
  clear?: () => MaybePromise<void>
}

export interface RetrieverRequest {
  query: string
  messages: Message[]
}

export interface Retriever {
  retrieve: (request: RetrieverRequest) => MaybePromise<RetrievedDocument[]>
}

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
}

export interface ChatReturn extends ChatState {
  send: (text: string) => Promise<void>
  stop: () => void
  retry: () => Promise<void>
  setInput: (value: string) => void
  clear: () => Promise<void>
}

export interface MemoryRecord {
  version: 1
  messages: Array<Omit<Message, 'createdAt'> & { createdAt: string }>
}

export interface SkillDefinition {
  name: string
  description: string
  systemPrompt: string
  examples?: Array<{ input: string; output: string }>
  tools?: string[]
  delegates?: string[]
  temperature?: number
  metadata?: Record<string, unknown>
  onActivate?: () => MaybePromise<{ tools?: ToolDefinition[] }>
}

export interface VectorDocument {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

export interface VectorMemory {
  store: (docs: VectorDocument[]) => MaybePromise<void>
  search: (
    embedding: number[],
    options?: { topK?: number; threshold?: number },
  ) => MaybePromise<RetrievedDocument[]>
  delete?: (ids: string[]) => MaybePromise<void>
}

export type EmbedFn = (text: string) => Promise<number[]>

export type AgentEvent =
  | { type: 'llm:start'; model?: string; messageCount: number }
  | { type: 'llm:first-token'; latencyMs: number }
  | { type: 'llm:end'; content: string; usage?: { promptTokens: number; completionTokens: number }; durationMs: number }
  | { type: 'tool:start'; name: string; args: Record<string, unknown> }
  | { type: 'tool:end'; name: string; result: string; durationMs: number }
  | { type: 'memory:load'; messageCount: number }
  | { type: 'memory:save'; messageCount: number }
  | { type: 'agent:step'; step: number; action: string }
  | { type: 'agent:delegate:start'; name: string; task: string; depth: number }
  | { type: 'agent:delegate:end'; name: string; result: string; durationMs: number; depth: number }
  | { type: 'error'; error: Error }

export interface Observer {
  name: string
  on: (event: AgentEvent) => void | Promise<void>
}

export interface EvalTestCase {
  input: string
  expected: string | ((result: string) => boolean)
  metadata?: Record<string, unknown>
}

export interface EvalResult {
  totalCases: number
  passed: number
  failed: number
  accuracy: number
  results: Array<{
    input: string
    output: string
    passed: boolean
    latencyMs: number
    tokenUsage?: { prompt: number; completion: number }
    error?: string
  }>
}

export interface EvalSuite {
  name: string
  cases: EvalTestCase[]
}
