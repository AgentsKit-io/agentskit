/** State of a response stream. */
export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error'

/** Tool call data carried by a streamed response chunk. */
export interface StreamToolCallPayload {
  id: string
  name: string
  args: string
  result?: string
}

/** Token counts reported for a model response. */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** One text, tool, reasoning, usage, error, or completion event from a stream. */
export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'reasoning' | 'usage' | 'error' | 'done'
  content?: string
  toolCall?: StreamToolCallPayload
  usage?: TokenUsage
  metadata?: Record<string, unknown>
}

/** Abortable asynchronous source of model response chunks. */
export interface StreamSource {
  stream: () => AsyncIterableIterator<StreamChunk>
  abort: () => void
}

/** Callbacks for observing chunks and completion from a stream hook. */
export interface UseStreamOptions {
  onChunk?: (chunk: StreamChunk) => void
  onComplete?: (text: string) => void
  onError?: (error: Error) => void
}

/** Latest chunk and accumulated text exposed by a stream hook. */
export interface UseStreamReturn {
  data: StreamChunk | null
  text: string
  status: StreamStatus
  error: Error | null
  stop: () => void
}
