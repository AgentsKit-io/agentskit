import type { StreamChunk } from '@agentskit/core'
import { readSSELines } from './stream-lines'

const SUCCESS_FINISH_REASONS = new Set(['stop', 'tool_calls', 'function_call'])

export async function* parseOpenAIStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()
  let finishReason: string | undefined

  const terminalError = (): StreamChunk | undefined => {
    if (finishReason === undefined || SUCCESS_FINISH_REASONS.has(finishReason)) return undefined
    const error = new Error(`OpenAI stream ended with non-success finish reason "${finishReason}".`)
    return { type: 'error', content: error.message, metadata: { error, finishReason } }
  }

  const flushToolCalls = function* (): Generator<StreamChunk> {
    for (const [, toolCall] of pendingToolCalls) {
      yield {
        type: 'tool_call',
        toolCall: { id: toolCall.id, name: toolCall.name, args: toolCall.args || '{}' },
      }
    }
    pendingToolCalls.clear()
  }

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') {
      const incomplete = terminalError()
      if (incomplete) {
        pendingToolCalls.clear()
        yield incomplete
        return
      }
      yield* flushToolCalls()
      yield { type: 'done' }
      return
    }

    try {
      const event = JSON.parse(data)
      const delta = event.choices?.[0]?.delta
      const candidateFinishReason = event.choices?.find(
        (choice: { finish_reason?: unknown }) => typeof choice.finish_reason === 'string',
      )?.finish_reason
      if (typeof candidateFinishReason === 'string') finishReason = candidateFinishReason

      if (typeof delta?.content === 'string') yield { type: 'text', content: delta.content }

      if (Array.isArray(delta?.tool_calls)) {
        for (const toolCall of delta.tool_calls) {
          const index: number = toolCall.index ?? 0
          const existing = pendingToolCalls.get(index)
          if (toolCall?.function?.name) {
            pendingToolCalls.set(index, {
              id: toolCall.id ?? existing?.id ?? `tool-${index}-${Date.now()}`,
              name: toolCall.function.name,
              args: (existing?.args ?? '') + (toolCall.function.arguments ?? ''),
            })
          } else if (existing && toolCall?.function?.arguments) {
            existing.args += toolCall.function.arguments
          }
        }
      }

      if (event.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: event.usage.prompt_tokens ?? 0,
            completionTokens: event.usage.completion_tokens ?? 0,
            totalTokens: event.usage.total_tokens ?? 0,
          },
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  const incomplete = terminalError()
  if (incomplete) {
    pendingToolCalls.clear()
    yield incomplete
    return
  }
  if (!finishReason) {
    pendingToolCalls.clear()
    const error = new Error('OpenAI stream ended before a terminal marker.')
    yield { type: 'error', content: error.message, metadata: { error } }
    return
  }

  yield* flushToolCalls()
  yield { type: 'done' }
}
