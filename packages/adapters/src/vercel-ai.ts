import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import type { RetryOptions } from './utils'
import { createStreamSource } from './stream-source'
import { readSSELines } from './stream-lines'
import { adapterErrorChunk } from './stream-errors'

export interface VercelAIConfig {
  api: string
  headers?: Record<string, string>
  retry?: RetryOptions
}

const UI_STREAM_HEADER = 'x-vercel-ai-ui-message-stream'

/**
 * Plain text mode: body bytes are text deltas. Used when the response is not
 * UI Message Stream v1.
 */
async function* parseVercelTextStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (text) yield { type: 'text', content: text }
    }
  } finally {
    reader.releaseLock()
  }

  yield { type: 'done' }
}

/**
 * Official AI SDK UI Message Stream protocol v1 (SSE):
 * data JSON parts (text-delta / reasoning-delta / error / abort / finish),
 * ending with `data: [DONE]`.
 */
async function* parseVercelUiMessageStreamV1(
  stream: ReadableStream,
): AsyncIterableIterator<StreamChunk> {
  for await (const data of readSSELines(stream)) {
    if (data === '[DONE]') {
      yield { type: 'done' }
      return
    }

    try {
      const part = JSON.parse(data) as {
        type?: string
        delta?: string
        textDelta?: string
        errorText?: string
        message?: string
        reason?: string
      }
      const type = part.type
      if (type === 'text-delta') {
        const delta = part.delta ?? part.textDelta
        if (typeof delta === 'string' && delta) {
          yield { type: 'text', content: delta }
        }
      } else if (type === 'reasoning-delta') {
        const delta = part.delta ?? part.textDelta
        if (typeof delta === 'string' && delta) {
          yield { type: 'reasoning', content: delta }
        }
      } else if (type === 'error') {
        const message = part.errorText ?? part.message ?? 'Vercel AI UI stream error'
        yield adapterErrorChunk(String(message))
        return
      } else if (type === 'abort') {
        yield adapterErrorChunk(part.reason ?? 'Vercel AI UI stream aborted by provider')
        return
      } else if (type === 'finish') {
        // Wait for [DONE] sentinel.
        continue
      }
    } catch {
      // Ignore non-JSON data lines.
    }
  }

  yield adapterErrorChunk('Vercel AI UI stream truncated before [DONE]')
}

/**
 * Dispatch parser: UI Message Stream v1 when header is present; otherwise
 * plain text mode. Second arg is the Response from createStreamSource.
 */
export async function* parseVercelStream(
  stream: ReadableStream,
  response?: Response,
): AsyncIterableIterator<StreamChunk> {
  const header =
    response?.headers.get(UI_STREAM_HEADER) ??
    response?.headers.get(UI_STREAM_HEADER.toLowerCase())
  if (header === 'v1') {
    yield* parseVercelUiMessageStreamV1(stream)
    return
  }
  yield* parseVercelTextStream(stream)
}

export function vercelAI(config: VercelAIConfig): AdapterFactory {
  const { api, headers = {}, retry } = config

  return {
    capabilities: {
      // Vercel AI routes can do any of these — whether they do depends on
      // your route handler. Omit the field instead of lying.
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        messages: request.messages.map(message => ({ role: message.role, content: message.content })),
        tools: request.context?.tools,
        systemPrompt: request.context?.systemPrompt,
      }

      return createStreamSource(
        (signal) => fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
          signal,
        }),
        parseVercelStream,
        'API',
        retry,
      )
    },
  }
}
