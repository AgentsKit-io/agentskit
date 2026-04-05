import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { createStreamSource, parseOllamaStream } from './utils'

export interface OllamaConfig {
  model: string
  baseUrl?: string
}

export function ollama(config: OllamaConfig): AdapterFactory {
  const { model, baseUrl = 'http://localhost:11434' } = config

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        model,
        stream: true,
        messages: request.messages.map(message => ({
          role: message.role,
          content: message.content,
        })),
      }

      return createStreamSource(
        (signal) => fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        }),
        parseOllamaStream,
        'Ollama API',
      )
    },
  }
}
