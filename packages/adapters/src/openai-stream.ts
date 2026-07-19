import type { StreamChunk } from '@agentskit/core'
import { readSSELines } from './stream-lines'
import { adapterErrorChunk, parseCompleteToolArgs } from './stream-errors'

const SUCCESS_FINISH_REASONS = new Set(['stop', 'tool_calls', 'function_call'])

export async function* parseOpenAIStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()
  let finishReason: string | undefined

  const terminalError = (message: string, extra?: Record<string, unknown>): StreamChunk => {
    const chunk = adapterErrorChunk(message)
    return {
      ...chunk,
      metadata: { ...chunk.metadata, ...extra, finishReason },
    }
  }

  const flushToolCalls = function* (): Generator<StreamChunk, boolean> {
    for (const [, toolCall] of pendingToolCalls) {
      const parsed = parseCompleteToolArgs(toolCall.args)
      if (!parsed.ok) {
        pendingToolCalls.clear()
        yield {
          type: 'error',
          content: parsed.error.message,
          metadata: { error: parsed.error, finishReason },
        }
        return false
      }
      yield {
        type: 'tool_call',
        toolCall: { id: toolCall.id, name: toolCall.name, args: parsed.args },
      }
    }
    pendingToolCalls.clear()
    return true
  }

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') {
      if (finishReason !== undefined && !SUCCESS_FINISH_REASONS.has(finishReason)) {
        pendingToolCalls.clear()
        yield terminalError(
          `OpenAI stream ended with non-success finish reason "${finishReason}".`,
          { finishReason },
        )
        return
      }
      if (!(yield* flushToolCalls())) return
      yield { type: 'done' }
      return
    }

    try {
      const event = JSON.parse(data) as {
        choices?: Array<{
          delta?: {
            content?: string
            tool_calls?: Array<{
              index?: number
              id?: string
              function?: { name?: string; arguments?: string }
            }>
          }
          finish_reason?: string
        }>
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
        }
      }
      const delta = event.choices?.[0]?.delta
      const candidateFinishReason = event.choices?.find(
        choice => typeof choice.finish_reason === 'string',
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
        } as StreamChunk
      }
    } catch {
      // Ignore malformed events.
    }
  }

  if (finishReason !== undefined && !SUCCESS_FINISH_REASONS.has(finishReason)) {
    pendingToolCalls.clear()
    yield terminalError(
      `OpenAI stream ended with non-success finish reason "${finishReason}".`,
      { finishReason },
    )
    return
  }
  if (!finishReason) {
    pendingToolCalls.clear()
    yield terminalError('OpenAI stream ended before a terminal marker.')
    return
  }

  if (!(yield* flushToolCalls())) return
  yield { type: 'done' }
}
