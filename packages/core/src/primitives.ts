import { AdapterError, ErrorCodes } from './errors'
import type {
  AgentEvent,
  Message,
  MessageRole,
  MessageStatus,
  Observer,
  StreamChunk,
  StreamSource,
  ToolDefinition,
  ToolExecutionContext,
} from './types'

let nextId = 0

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${nextId++}`
}

export function createEventEmitter() {
  const observers = new Set<Observer>()

  return {
    addObserver(observer: Observer): () => void {
      observers.add(observer)
      return () => { observers.delete(observer) }
    },
    emit(event: AgentEvent): void {
      for (const observer of observers) {
        try {
          const result = observer.on(event)
          if (result && typeof (result as Promise<void>).catch === 'function') {
            (result as Promise<void>).catch(() => {})
          }
        } catch {
          // Observer errors must never break the main loop.
        }
      }
    },
  }
}

export function buildMessage(params: {
  role: MessageRole
  content: string
  status?: MessageStatus
  metadata?: Record<string, unknown>
  toolCallId?: string
}): Message {
  return {
    id: generateId('msg'),
    role: params.role,
    content: params.content,
    status: params.status ?? 'complete',
    metadata: params.metadata,
    toolCallId: params.toolCallId,
    createdAt: new Date(),
  }
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return value != null && typeof value === 'object' && Symbol.asyncIterator in value
}

export async function executeToolCall(
  tool: ToolDefinition,
  args: Record<string, unknown>,
  context: ToolExecutionContext,
  onPartialResult?: (accumulated: string) => void,
): Promise<string> {
  const raw = tool.execute?.(args, context)

  if (isAsyncIterable(raw)) {
    let accumulated = ''
    for await (const chunk of raw) {
      accumulated += String(chunk)
      onPartialResult?.(accumulated)
    }
    return accumulated
  }

  const result = await raw
  return result == null ? '' : String(result)
}

export function safeParseArgs(args: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(args)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function createToolLifecycle(tools: Map<string, ToolDefinition>) {
  const initialized = new Set<string>()

  return {
    async init(tool: ToolDefinition): Promise<void> {
      if (tool.init && !initialized.has(tool.name)) {
        await tool.init()
        initialized.add(tool.name)
      }
    },
    async disposeAll(): Promise<void> {
      for (const name of initialized) {
        try {
          await tools.get(name)?.dispose?.()
        } catch {
          // Dispose errors should not propagate.
        }
      }
      initialized.clear()
    },
  }
}

export interface ConsumeStreamHandlers {
  onText?: (accumulated: string) => void
  onReasoning?: (accumulated: string) => void
  onToolCall?: (chunk: StreamChunk) => Promise<void> | void
  onToolResult?: (content: string) => void
  onError?: (error: Error) => void
  onDone: (accumulatedText: string) => void
}

export async function consumeStream(
  source: StreamSource,
  handlers: ConsumeStreamHandlers,
): Promise<void> {
  let accumulatedText = ''
  let accumulatedReasoning = ''

  try {
    const iterator = source.stream()
    for await (const chunk of iterator) {
      if (chunk.type === 'text' && chunk.content) {
        accumulatedText += chunk.content
        handlers.onText?.(accumulatedText)
      } else if (chunk.type === 'reasoning' && chunk.content) {
        accumulatedReasoning += chunk.content
        handlers.onReasoning?.(accumulatedReasoning)
      } else if (chunk.type === 'tool_call') {
        await handlers.onToolCall?.(chunk)
      } else if (chunk.type === 'tool_result' && chunk.content) {
        handlers.onToolResult?.(chunk.content)
      } else if (chunk.type === 'error') {
        handlers.onError?.(new AdapterError({
          code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
          message: chunk.content ?? 'Stream error',
          hint: 'The adapter stream emitted an error chunk. Check your API key, network connection, and model configuration.',
        }))
        return
      } else if (chunk.type === 'done') {
        break
      }
    }
    handlers.onDone(accumulatedText)
  } catch (error) {
    const err = error instanceof AdapterError
      ? error
      : new AdapterError({
          code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
          message: `Stream consumption failed: ${error instanceof Error ? error.message : String(error)}`,
          hint: 'The adapter stream threw an exception. Verify your adapter is correctly configured and the provider API is reachable.',
          cause: error,
        })
    handlers.onError?.(err)
  }
}
