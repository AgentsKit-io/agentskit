import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { createStreamSource, parseAnthropicStream, type RetryOptions } from './utils'

export interface AnthropicConfig {
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens?: number
  retry?: RetryOptions
}

export function anthropic(config: AnthropicConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://api.anthropic.com', maxTokens = 4096, retry } = config

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        model,
        max_tokens: request.context?.maxTokens ?? maxTokens,
        messages: request.messages
          .filter(message => message.role !== 'system')
          .map(message => ({ role: message.role, content: message.content })),
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
