import { buildMessage } from './primitives'
import { formatRetrievedDocuments } from './rag'
import type { AdapterRequest, ChatConfig, Message, ToolCall, ToolDefinition } from './types'
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
): Promise<AdapterRequest> {
  const withSystem = mergeSystemMessages(messages, systemPrompt)
  const retrievedDocuments = config.retriever && text
    ? await config.retriever.retrieve({ query: text, messages })
    : []
  const retrievalMessage = buildRetrievalMessage(formatRetrievedDocuments(retrievedDocuments))

  return {
    messages: retrievalMessage ? [retrievalMessage, ...withSystem] : withSystem,
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
