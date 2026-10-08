import { buildMessage } from './primitives'
import { formatRetrievedDocuments } from './rag'
import type { AdapterRequest, AgentEventContext, ChatConfig, ChatState, Message, ToolCall, ToolDefinition } from './types'
import type { TokenUsage } from './types/stream'

/** Normalize stream usage to finite nonnegative prompt/completion counts for llm:end. */
export function normalizeLlmUsage(
  usage: TokenUsage | undefined,
): { promptTokens: number; completionTokens: number } | undefined {
  if (!usage) return undefined
  const promptTokens = Number.isFinite(usage.promptTokens) && usage.promptTokens >= 0
    ? usage.promptTokens
    : 0
  const completionTokens = Number.isFinite(usage.completionTokens) && usage.completionTokens >= 0
    ? usage.completionTokens
    : 0
  return { promptTokens, completionTokens }
}

/** Add one stream usage chunk into cumulative session totals (hostile values → 0). */
export function accumulateUsage(
  current: TokenUsage,
  usage: TokenUsage,
): TokenUsage {
  const prompt = Number.isFinite(usage.promptTokens) && usage.promptTokens >= 0 ? usage.promptTokens : 0
  const completion = Number.isFinite(usage.completionTokens) && usage.completionTokens >= 0
    ? usage.completionTokens
    : 0
  const total = Number.isFinite(usage.totalTokens) && usage.totalTokens >= 0 ? usage.totalTokens : 0
  return {
    promptTokens: current.promptTokens + prompt,
    completionTokens: current.completionTokens + completion,
    totalTokens: current.totalTokens + total,
  }
}

/** Immutable map over a single message by id. */
export function mapMessageById(
  messages: Message[],
  messageId: string,
  updater: (message: Message) => Message,
): Message[] {
  return messages.map(message => (message.id === messageId ? updater(message) : message))
}

/** Immutable patch of one tool call nested under an assistant message. */
export function mapToolCallById(
  messages: Message[],
  messageId: string,
  toolCallId: string,
  patch: Partial<ToolCall>,
): Message[] {
  return mapMessageById(messages, messageId, message => ({
    ...message,
    toolCalls: (message.toolCalls ?? []).map(call =>
      call.id === toolCallId ? { ...call, ...patch } : call,
    ),
  }))
}

export function sameToolLifecycle(
  previous: Map<string, ToolDefinition>,
  next: Map<string, ToolDefinition>,
): boolean {
  if (previous.size !== next.size) return false
  for (const [name, tool] of previous) {
    const replacement = next.get(name)
    if (
      !replacement
      || replacement.execute !== tool.execute
      || replacement.init !== tool.init
      || replacement.dispose !== tool.dispose
    ) return false
  }
  return true
}

/** Build tool-result messages + a fresh streaming assistant for multi-turn tool loops. */
export function buildToolContinuation(
  messages: Message[],
  assistantId: string,
  calls: ToolCall[],
  buildMsg: (init: { role: Message['role']; content: string; toolCallId?: string; status?: Message['status'] }) => Message,
): { messages: Message[]; nextAssistantId: string } {
  const results = calls.map(call =>
    buildMsg({
      role: 'tool',
      content: call.result ?? call.error ?? '',
      toolCallId: call.id,
    }),
  )
  const nextA = buildMsg({ role: 'assistant', content: '', status: 'streaming' })
  return {
    messages: [
      ...messages.map(message =>
        message.id === assistantId ? { ...message, status: 'complete' as const } : message
      ),
      ...results,
      nextA,
    ],
    nextAssistantId: nextA.id,
  }
}

export async function buildAdapterRequest(
  config: ChatConfig,
  messages: Message[],
  text: string,
  systemPrompt: string | undefined,
  tools: ToolDefinition[],
  correlation?: AdapterRequest['correlation'],
): Promise<AdapterRequest> {
  const withSystem = mergeSystemMessages(messages, systemPrompt)
  const retrievedDocuments = config.retriever && text
    ? await config.retriever.retrieve({ query: text, messages })
    : []
  const retrievalMessage = buildRetrievalMessage(formatRetrievedDocuments(retrievedDocuments))

  return {
    messages: retrievalMessage ? [retrievalMessage, ...withSystem] : withSystem,
    ...(correlation ? { correlation } : {}),
    context: {
      systemPrompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      tools,
      metadata: retrievedDocuments.length > 0 ? { retrievedDocuments } : undefined,
    },
  }
}

/**
 * Ensure a system prompt is present at the head of the message list.
 *
 * The chat controller threads `config.systemPrompt` through on every
 * stream; this helper keeps the message-array transform out of the
 * controller body so it can be tested + reasoned about in isolation.
 * Returns the original array (no-op) when the prompt is empty or
 * already at any position in the list — re-prepending would duplicate
 * the prompt on the second turn.
 */
export function mergeSystemMessages(
  messages: Message[],
  systemPrompt?: string,
): Message[] {
  if (!systemPrompt) return messages
  if (
    messages.some(
      message => message.role === 'system' && message.content === systemPrompt,
    )
  ) {
    return messages
  }
  return [buildMessage({ role: 'system', content: systemPrompt }), ...messages]
}

/**
 * Wrap retrieved RAG documents in a system-role message so the model
 * receives them as authoritative context rather than as part of the
 * user turn. Returns `null` when there is nothing to inject so the
 * caller can skip pushing an empty message.
 */
export function buildRetrievalMessage(documentsText: string): Message | null {
  if (!documentsText) return null
  return buildMessage({
    role: 'system',
    content: `Use the retrieved context below when it is relevant.\n\n${documentsText}`,
  })
}

/** Controller tool-loop seam, shared by sends and confirmation continuation. */
export function createControllerToolLoop({ getConfig, getState, getCorrelation, set, run, persist, persistPending }: {
  getConfig: () => ChatConfig
  getState: () => ChatState
  getCorrelation: () => AgentEventContext
  set: (updater: (current: ChatState) => ChatState) => void
  run: (aid: string, text: string, generation: number, correlation: AgentEventContext) => Promise<boolean>
  persist: (messages: Message[], correlation?: AgentEventContext) => Promise<void>
  persistPending: () => Promise<void>
}) {
  const message = buildMessage
  const finalize = async (aid: string, shouldPersist = true) => {
    let done: Message | undefined
    set(current => ({
      ...current,
      messages: current.messages.map(message => {
        if (message.id !== aid) return message
        done = { ...message, status: 'complete' as const }
        return done
      }),
      status: 'idle',
      error: null,
    }))
    if (done) getConfig().onMessage?.(done)
    if (done && shouldPersist) await persist(getState().messages, getCorrelation())
  }

  const continueTools = (aid: string, calls: ToolCall[]): string => {
    let nextId = ''
    set(current => {
      const { messages: next, nextAssistantId } = buildToolContinuation(
        current.messages,
        aid,
        calls,
        message,
      )
      nextId = nextAssistantId
      return {
        ...current,
        messages: next,
        status: 'streaming',
        error: null,
      }
    })
    return nextId
  }

  /**
   * Resume the agent loop after tool calls on `aid` have settled
   * (no new LLM turn has been issued yet). Used by both `startStream` and
   * `approve`/`deny` so the flow is identical whether tools auto-run or
   * wait for user confirmation.
   */
  const resume = async (aid: string, g: number, correlation: AgentEventContext) => {
    let id = aid

    for (let remaining = getConfig().maxToolIterations ?? 5; remaining > 0; remaining--) {
      const assistant = getState().messages.find(message => message.id === id)
      const calls = assistant?.toolCalls ?? []
      const waits = calls.some(call => call.status !== 'complete' && call.status !== 'error')

      // Nothing to feed back, or something still awaiting confirmation —
      // stop here; the caller drives the next step.
      if (!calls.length || waits) {
        if (waits) await persistPending()
        await finalize(id, !waits)
        return
      }

      id = continueTools(id, calls)
      const ok = await run(id, '', g, correlation)
      if (!ok) return
    }

    await finalize(id)
  }

  /**
   * Runs one `send` — an LLM turn, plus any follow-up turns needed to feed
   * completed tool results back to the model.
   */
  const start = async (aid: string, text: string, g: number, correlation: AgentEventContext) => {
    const ok = await run(aid, text, g, correlation)
    if (!ok) return
    await resume(aid, g, correlation)
  }

  return { start, resume }
}
