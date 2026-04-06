import type { AdapterRequest, Message, StreamChunk, StreamSource } from '@agentskit/core'

export function toProviderMessages(messages: Message[]) {
  return messages.map(message => ({
    role: message.role,
    content: message.content,
  }))
}

export async function* readSSELines(stream: ReadableStream): AsyncIterableIterator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data) yield data
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* readNDJSONLines(stream: ReadableStream): AsyncIterableIterator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed) yield trimmed
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* parseOpenAIStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') {
      for (const [, tc] of pendingToolCalls) {
        yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
      }
      pendingToolCalls.clear()
      yield { type: 'done' }
      return
    }

    try {
      const event = JSON.parse(data)
      const delta = event.choices?.[0]?.delta

      if (typeof delta?.content === 'string') {
        yield { type: 'text', content: delta.content }
      }

      if (Array.isArray(delta?.tool_calls)) {
        for (const toolCall of delta.tool_calls) {
          const index: number = toolCall.index ?? 0
          const existing = pendingToolCalls.get(index)

          if (toolCall?.function?.name) {
            // First chunk for this tool call — store it
            pendingToolCalls.set(index, {
              id: toolCall.id ?? existing?.id ?? `tool-${index}-${Date.now()}`,
              name: toolCall.function.name,
              args: (existing?.args ?? '') + (toolCall.function.arguments ?? ''),
            })
          } else if (existing && toolCall?.function?.arguments) {
            // Subsequent chunk — accumulate arguments
            existing.args += toolCall.function.arguments
          }
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  // Flush any remaining tool calls if stream ends without [DONE]
  for (const [, tc] of pendingToolCalls) {
    yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
  }
  pendingToolCalls.clear()

  yield { type: 'done' }
}

export async function* parseAnthropicStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()

  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') continue

    try {
      const event = JSON.parse(data)
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta?.text) {
        yield { type: 'text', content: event.delta.text }
      } else if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta') {
        const index: number = event.index ?? 0
        const existing = pendingToolCalls.get(index)
        if (existing) {
          existing.args += event.delta.partial_json ?? ''
        }
      } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        const index: number = event.index ?? 0
        pendingToolCalls.set(index, {
          id: event.content_block.id,
          name: event.content_block.name,
          args: '',
        })
      } else if (event.type === 'content_block_stop') {
        const index: number = event.index ?? 0
        const tc = pendingToolCalls.get(index)
        if (tc) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: tc.id,
              name: tc.name,
              args: tc.args || '{}',
            },
          }
          pendingToolCalls.delete(index)
        }
      } else if (event.type === 'message_stop') {
        // Flush any remaining tool calls
        for (const [, tc] of pendingToolCalls) {
          yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
        }
        pendingToolCalls.clear()
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  // Flush remaining if stream ends without message_stop
  for (const [, tc] of pendingToolCalls) {
    yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
  }
  pendingToolCalls.clear()

  yield { type: 'done' }
}

export async function* parseGeminiStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  for await (const data of readSSELines(stream)) {
    try {
      const event = JSON.parse(data)
      const parts = event.candidates?.[0]?.content?.parts
      if (!Array.isArray(parts)) continue

      for (const part of parts) {
        if (typeof part.text === 'string' && part.text) {
          yield { type: 'text', content: part.text }
        } else if (part.functionCall) {
          const fc = part.functionCall
          yield {
            type: 'tool_call',
            toolCall: {
              id: fc.id ?? `${fc.name}-${Date.now()}`,
              name: fc.name,
              args: JSON.stringify(fc.args ?? {}),
            },
          }
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  yield { type: 'done' }
}

export async function* parseOllamaStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  for await (const data of readNDJSONLines(stream)) {
    try {
      const event = JSON.parse(data)
      if (event.message?.content) {
        yield { type: 'text', content: event.message.content }
      }
      if (Array.isArray(event.message?.tool_calls)) {
        for (const tc of event.message.tool_calls) {
          if (tc?.function?.name) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: tc.id ?? `${tc.function.name}-${Date.now()}`,
                name: tc.function.name,
                args: typeof tc.function.arguments === 'string'
                  ? tc.function.arguments
                  : JSON.stringify(tc.function.arguments ?? {}),
              },
            }
          }
        }
      }
      if (event.done) {
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  yield { type: 'done' }
}

export function createStreamSource(
  doFetch: (signal: AbortSignal) => Promise<Response>,
  parse: (stream: ReadableStream) => AsyncIterableIterator<StreamChunk>,
  errorLabel: string,
): StreamSource {
  let abortController: AbortController | null = new AbortController()

  return {
    stream: async function* (): AsyncIterableIterator<StreamChunk> {
      try {
        const response = await doFetch(abortController!.signal)

        if (!response.ok || !response.body) {
          yield { type: 'error', content: `${errorLabel} error: ${response.status}` }
          return
        }

        yield* parse(response.body)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        yield {
          type: 'error',
          content: err instanceof Error ? err.message : String(err),
        }
      }
    },
    abort: () => {
      abortController?.abort()
      abortController = null
    },
  }
}
