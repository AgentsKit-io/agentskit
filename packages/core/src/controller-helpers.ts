import { buildMessage } from './primitives'
import { formatRetrievedDocuments } from './rag'
import type { AdapterRequest, ChatConfig, Message, ToolDefinition } from './types'

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
