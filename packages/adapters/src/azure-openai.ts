import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { createStreamSource, parseOpenAIStream, toProviderMessages, type RetryOptions } from './utils'

export interface AzureOpenAIConfig {
  apiKey: string
  /** Resource endpoint, e.g. `https://my-resource.openai.azure.com`. */
  endpoint: string
  /** Deployment name (NOT the underlying model name — Azure routes by deployment). */
  deployment: string
  /** Azure REST `api-version`. Defaults to `2024-10-21`. */
  apiVersion?: string
  retry?: RetryOptions
  /** Surface usage by setting `stream_options.include_usage`. Defaults to true. */
  includeUsage?: boolean
}

const DEFAULT_API_VERSION = '2024-10-21'

export function azureOpenAI(config: AzureOpenAIConfig): AdapterFactory {
  const { apiKey, endpoint, deployment, apiVersion = DEFAULT_API_VERSION, retry } = config
  const includeUsage = config.includeUsage ?? true
  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(apiVersion)}`

  return {
    capabilities: {
      streaming: true,
      tools: true,
      usage: true,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const body: Record<string, unknown> = {
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
      if (includeUsage) body.stream_options = { include_usage: true }

      return createStreamSource(
        (signal) => fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify(body),
          signal,
        }),
        parseOpenAIStream,
        'Azure OpenAI API',
        retry,
      )
    },
  }
}

export const azureOpenAIAdapter = azureOpenAI
