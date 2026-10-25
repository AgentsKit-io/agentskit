import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { parseAnthropicStream, type RetryOptions } from './utils'
import { createStreamSource } from './stream-source'
import { toAnthropicMessages } from './tool-history'

/**
 * Configuration options for the Anthropic chat adapter.
 */
export interface AnthropicConfig {
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
  retry?: RetryOptions
}

/**
 * Creates an adapter for Anthropic Messages API.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = anthropic({ apiKey: '…', model: 'model-name' })
 */
export function anthropic(config: AnthropicConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://api.anthropic.com', maxTokens = 4096, retry } = config

  return {
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: model.includes('sonnet') || model.includes('opus'),
      multiModal: true,
      usage: true,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        model,
        max_tokens: request.context?.maxTokens ?? maxTokens,
        messages: toAnthropicMessages(request.messages),
        system: request.messages.find(message => message.role === 'system')?.content,
        tools: request.context?.tools?.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.schema,
        })),
        stream: true,
      }

      return createStreamSource(
        (signal) => fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
          signal,
        }),
        parseAnthropicStream,
        'Anthropic API',
        retry,
      )
    },
  }
}
