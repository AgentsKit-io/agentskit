import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { createStreamSource, parseOpenAIStream, toProviderMessages, type RetryOptions } from './utils'

export interface OpenAIConfig {
  apiKey: string
  model: string
  baseUrl?: string
  retry?: RetryOptions
}

export function openai(config: OpenAIConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://api.openai.com', retry } = config

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const body = {
        model,
        messages: toProviderMessages(request.messages),
        tools: request.context?.tools?.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.schema,
          },
        })),
        temperature: request.context?.temperature,
        max_tokens: request.context?.maxTokens,
        stream: true,
      }

      return createStreamSource(
        (signal) => fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
          signal,
        }),
        parseOpenAIStream,
        'OpenAI API',
        retry,
      )
    },
  }
}
