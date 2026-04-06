export type StreamStatus = 'idle' | 'streaming' | 'complete' | 'error'

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
