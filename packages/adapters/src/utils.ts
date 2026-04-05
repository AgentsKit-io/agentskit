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
  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') {
      yield { type: 'done' }
      return
    }

    try {
      const event = JSON.parse(data)
      const delta = event.choices?.[0]?.delta

      if (typeof delta?.content === 'string') {
        yield { type: 'text', content: delta.content }
      } else if (Array.isArray(delta?.tool_calls)) {
        for (const toolCall of delta.tool_calls) {
          if (toolCall?.function?.name) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: toolCall.id ?? `${toolCall.function.name}-${Date.now()}`,
                name: toolCall.function.name,
                args: toolCall.function.arguments ?? '{}',
              },
            }
          }
        }
      }
    } catch {
      // Ignore malformed events.
    }
  }

  yield { type: 'done' }
}

export async function* parseAnthropicStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') continue

    try {
      const event = JSON.parse(data)
      if (event.type === 'content_block_delta' && event.delta?.text) {
        yield { type: 'text', content: event.delta.text }
      } else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        yield {
          type: 'tool_call',
          toolCall: {
            id: event.content_block.id,
            name: event.content_block.name,
            args: JSON.stringify(event.content_block.input ?? {}),
          },
        }
      } else if (event.type === 'message_stop') {
        yield { type: 'done' }
        return
      }
    } catch {
      // Ignore malformed events.
    }
  }

  yield { type: 'done' }
}

export async function* parseGeminiStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  for await (const data of readSSELines(stream)) {
    try {
      const event = JSON.parse(data)
      const text = event.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? '')
        .join('')
      if (text) yield { type: 'text', content: text }
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
