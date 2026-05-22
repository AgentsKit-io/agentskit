import type { AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { createStreamSource, parseOpenAIStream, toProviderMessages, type RetryOptions } from './utils'

export interface OpenAIConfig {
  apiKey: string
  model: string
  baseUrl?: string
  retry?: RetryOptions
  /**
   * Ask the provider to include token usage in the final stream chunk via
   * `stream_options: { include_usage: true }`. Off by default because some
   * OpenAI-compatible providers (OpenRouter proxies to a long tail of
   * backends) reject unknown params with a 4xx and break the whole stream.
   * Turn this on for vanilla `api.openai.com`.
   */
  includeUsage?: boolean
}

export function openai(config: OpenAIConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://api.openai.com', retry } = config
  // Auto: on for canonical OpenAI, off for every other compatible endpoint
  // where the param is a known source of 4xx surprises.
  // Match the canonical OpenAI host exactly — a substring/prefix check
  // would also accept `https://api.openai.com.evil.test`.
  const isCanonicalOpenAI = (() => {
    try {
      return new URL(baseUrl).host === 'api.openai.com'
    } catch {
      return false
    }
  })()
  const includeUsage = config.includeUsage ?? isCanonicalOpenAI

  return {
    capabilities: {
      streaming: true,
      tools: true,
      // o1 / o3 models emit reasoning; older models don't. Accurate per-model
      // detection would need a model registry; 'true' is the safer default here.
      reasoning: model.startsWith('o1') || model.startsWith('o3'),
      multiModal: model.startsWith('gpt-4') || model.startsWith('o'),
      usage: true,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const body: Record<string, unknown> = {
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
      if (includeUsage) body.stream_options = { include_usage: true }

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
