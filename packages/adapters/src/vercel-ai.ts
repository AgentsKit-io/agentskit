import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import { createStreamSource } from './utils'

export interface VercelAIConfig {
  api: string
  headers?: Record<string, string>
}

async function* parseVercelStream(stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
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

export function vercelAI(config: VercelAIConfig): AdapterFactory {
  const { api, headers = {} } = config

  return {
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
      )
    },
  }
}
