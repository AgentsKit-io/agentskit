import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { parseOllamaStream, type RetryOptions } from './utils'
import { providerParts } from './content-parts'
import { createStreamSource } from './stream-source'

/**
 * Configuration options for the Ollama chat adapter.
 */
export interface OllamaConfig {
  model: string
  baseUrl?: string
  multiModal?: boolean
  retry?: RetryOptions
}

/**
 * Creates an adapter for Ollama chat.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = ollama({ model: 'llama3.1' })
 */
export function ollama(config: OllamaConfig): AdapterFactory {
  const { model, baseUrl = 'http://localhost:11434', retry } = config

  return {
    capabilities: {
      streaming: true,
      tools: false,   // varies by model; default 'false' — enable via capabilities.extensions if your model supports it
      multiModal: config.multiModal ?? (model.includes('llava') || model.includes('vision')),
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        model,
        stream: true,
        messages: request.messages.map(message => {
          const parts = providerParts(message, 'ollama', config.multiModal ?? (model.includes('llava') || model.includes('vision')))
          const images = parts?.filter(part => part.image !== undefined).map(part => part.image)
          return {
            role: message.role,
            content: parts ? parts.filter(part => part.type === 'text').map(part => part.text).join('\n') : message.content,
            ...(images?.length ? { images } : {}),
          }
        }),
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
        retry,
      )
    },
  }
}
