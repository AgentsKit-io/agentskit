import { AdapterError, AgentsKitError, ErrorCodes } from './errors'
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
import type { TokenUsage } from './types/stream'

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

function serializeToolResult(result: unknown): string {
  if (result == null) return ''
  if (typeof result === 'string' || result instanceof Error) return String(result)

  try {
    return JSON.stringify(result) ?? String(result)
  } catch {
    return String(result)
  }
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
  return serializeToolResult(result)
}

export function safeParseArgs(args: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(args)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

interface ToolLifecycleState {
  initialized: Set<string>
  initializing: Map<string, Promise<void>>
  activeExecutions: number
  retired: boolean
  disposal: Promise<void> | undefined
  retirement: Promise<void> | undefined
  resolveRetirement: (() => void) | undefined
  tools: Map<string, ToolDefinition>
}

const lifecycleStates = new WeakMap<object, ToolLifecycleState>()

function retirementPromise(state: ToolLifecycleState): Promise<void> {
  if (!state.retirement) {
    state.retirement = new Promise<void>(resolve => {
      state.resolveRetirement = resolve
    })
  }
  return state.retirement
}

function scheduleLifecycleDisposal(state: ToolLifecycleState): void {
  if (
    !state.retired
    || state.activeExecutions > 0
    || state.initializing.size > 0
    || state.disposal
  ) return

  state.disposal = (async () => {
    const names = [...state.initialized]
    state.initialized.clear()
    for (const name of names) {
      try {
        await state.tools.get(name)?.dispose?.()
      } catch {
        // Dispose errors should not propagate.
      }
    }
  })().finally(() => {
    state.disposal = undefined
    state.resolveRetirement?.()
    state.resolveRetirement = undefined
  })
}

export function createToolLifecycle(tools: Map<string, ToolDefinition>) {
  const state: ToolLifecycleState = {
    initialized: new Set<string>(),
    initializing: new Map<string, Promise<void>>(),
    activeExecutions: 0,
    retired: false,
    disposal: undefined,
    retirement: undefined,
    resolveRetirement: undefined,
    tools,
  }

  const lifecycle = {
    async init(tool: ToolDefinition): Promise<void> {
      // A retired lifecycle cannot start new work. An execution that acquired
      // it before retirement may still finish initialization safely.
      if (state.retired && state.activeExecutions === 0) return
      if (!tool.init || state.initialized.has(tool.name)) return

      const pending = state.initializing.get(tool.name)
      if (pending) {
        await pending
        return
      }

      const initialization = (async () => {
        await tool.init?.()
        state.initialized.add(tool.name)
      })()
      state.initializing.set(tool.name, initialization)
      try {
        await initialization
      } finally {
        state.initializing.delete(tool.name)
        scheduleLifecycleDisposal(state)
      }
    },
    async disposeAll(): Promise<void> {
      state.retired = true
      const completion = retirementPromise(state)
      scheduleLifecycleDisposal(state)
      await completion
    },
  }

  lifecycleStates.set(lifecycle, state)
  return lifecycle
}

/** Hold a lifecycle open for one tool execution without changing its public shape. */
export function acquireToolLifecycle(
  lifecycle: ReturnType<typeof createToolLifecycle>,
): (() => Promise<void>) | undefined {
  const state = lifecycleStates.get(lifecycle)
  if (!state || state.retired) return undefined

  state.activeExecutions++
  let released = false
  return async () => {
    if (released) return
    released = true
    state.activeExecutions--
    scheduleLifecycleDisposal(state)
    if (state.retirement) await state.retirement
  }
}

export interface ConsumeStreamHandlers {
  onText?: (accumulated: string) => void
  onReasoning?: (accumulated: string) => void
  onToolCall?: (chunk: StreamChunk) => Promise<void> | void
  onToolResult?: (content: string) => void
  onUsage?: (usage: TokenUsage) => void
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
      } else if (chunk.type === 'usage' && chunk.usage) {
        handlers.onUsage?.(chunk.usage)
      } else if (chunk.type === 'error') {
        handlers.onError?.(new AdapterError({
          code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
          message: chunk.content ?? 'Stream error',
          hint: 'Key/network/model/provider',
        }))
        return
      } else if (chunk.type === 'done') {
        break
      }
    }
    handlers.onDone(accumulatedText)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const err = error instanceof AgentsKitError
      ? error
      : new AdapterError({
          code: ErrorCodes.AK_ADAPTER_STREAM_FAILED,
          message: `Stream failed: ${detail}`,
          hint: 'Adapter/provider',
          cause: error,
        })
    handlers.onError?.(err)
  }
}
