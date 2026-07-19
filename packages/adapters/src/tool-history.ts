import type { Message } from '@agentskit/core'

/** Normalize tool-call args for provider wire formats. */
function toolInput(args: unknown): Record<string, unknown> {
  if (args == null) return {}
  if (typeof args === 'string') {
    try {
      const parsed: unknown = JSON.parse(args)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return { value: parsed }
    } catch {
      return {}
    }
  }
  if (typeof args === 'object' && !Array.isArray(args)) {
    return args as Record<string, unknown>
  }
  return { value: args }
}

function toolResponsePayload(content: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return { result: parsed }
  } catch {
    return { result: content }
  }
}

/**
 * Anthropic Messages API multi-turn tool history.
 * Assistant tool calls → `tool_use` blocks; tool results → user `tool_result` blocks.
 * Shared by Anthropic direct and Bedrock Anthropic models.
 */
export function toAnthropicMessages(
  messages: Message[],
): Array<{ role: string; content: unknown }> {
  const knownNames = new Map<string, string>()
  const output: Array<{ role: string; content: unknown }> = []

  for (const message of messages) {
    if (message.role === 'system') continue

    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      for (const tc of message.toolCalls) knownNames.set(tc.id, tc.name)
      const blocks: Array<Record<string, unknown>> = []
      if (message.content) {
        blocks.push({ type: 'text', text: message.content })
      }
      for (const tc of message.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: toolInput(tc.args),
        })
      }
      output.push({ role: 'assistant', content: blocks })
      continue
    }

    if (message.role === 'tool') {
      const id = message.toolCallId
      if (!id || !knownNames.has(id)) continue
      const block = {
        type: 'tool_result',
        tool_use_id: id,
        content: message.content,
      }
      const previous = output[output.length - 1]
      if (
        previous?.role === 'user' &&
        Array.isArray(previous.content) &&
        previous.content.every(item => (
          item && typeof item === 'object' && (item as { type?: unknown }).type === 'tool_result'
        ))
      ) {
        previous.content.push(block)
      } else {
        output.push({ role: 'user', content: [block] })
      }
      continue
    }

    if (message.role === 'assistant' && !message.content) continue

    const previous = output[output.length - 1]
    if (message.role === 'user' && previous?.role === 'user') {
      const previousBlocks = Array.isArray(previous.content)
        ? previous.content
        : [{ type: 'text', text: previous.content }]
      previous.content = [...previousBlocks, { type: 'text', text: message.content }]
    } else {
      output.push({ role: message.role, content: message.content })
    }
  }

  return output
}

/**
 * Gemini / Vertex multi-turn tool history.
 * Assistant tool calls → model `functionCall` parts;
 * tool results → user `functionResponse` parts (name correlated via toolCallId).
 */
export function toGeminiContents(
  messages: Message[],
): Array<{ role: string; parts: Array<Record<string, unknown>> }> {
  const knownNames = new Map<string, string>()
  const output: Array<{ role: string; parts: Array<Record<string, unknown>> }> = []

  for (const message of messages) {
    if (message.role === 'system') continue

    if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
      for (const tc of message.toolCalls) knownNames.set(tc.id, tc.name)
      const parts: Array<Record<string, unknown>> = []
      if (message.content) {
        parts.push({ text: message.content })
      }
      for (const tc of message.toolCalls) {
        parts.push({
          functionCall: {
            id: tc.id,
            name: tc.name,
            args: toolInput(tc.args),
          },
        })
      }
      output.push({ role: 'model', parts })
      continue
    }

    if (message.role === 'tool') {
      const id = message.toolCallId
      const name = id ? knownNames.get(id) : undefined
      if (!name) continue
      const part = {
        functionResponse: {
          id,
          name,
          response: toolResponsePayload(message.content),
        },
      }
      const previous = output[output.length - 1]
      if (
        previous?.role === 'user' &&
        previous.parts.every(item => item.functionResponse !== undefined)
      ) {
        previous.parts.push(part)
      } else {
        output.push({ role: 'user', parts: [part] })
      }
      continue
    }

    if (message.role === 'assistant' && !message.content) continue

    const role = message.role === 'assistant' ? 'model' : 'user'
    const previous = output[output.length - 1]
    if (previous?.role === role) {
      previous.parts.push({ text: message.content })
    } else {
      output.push({ role, parts: [{ text: message.content }] })
    }
  }

  return output
}
