import type { AdapterCapabilities, AdapterFactory, AdapterRequest, StreamSource } from '@agentskit/core'
import { parseOpenAIStream, toProviderMessages, type RetryOptions } from './utils'
import { createStreamSource } from './stream-source'

/**
 * Configuration options for the OpenAI chat adapter.
 */
export interface OpenAIConfig {
  apiKey: string
  model: string
  baseUrl?: string
  path?: string
  headers?: HeadersInit
  fetch?: typeof globalThis.fetch
  retry?: RetryOptions
  /**
   * Ask the provider to include token usage in the final stream chunk via
   * `stream_options: { include_usage: true }`. Off by default because some
   * OpenAI-compatible providers (OpenRouter proxies to a long tail of
   * backends) reject unknown params with a 4xx and break the whole stream.
   * Turn this on for vanilla `api.openai.com`.
   */
  includeUsage?: boolean
  /** Explicit capability facts take precedence over model-name heuristics. */
  capabilities?: Partial<AdapterCapabilities>
}

/**
 * Creates an adapter for OpenAI chat completions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = openai({ apiKey: '…', model: 'model-name' })
 */
export function openai(config: OpenAIConfig): AdapterFactory {
  const { apiKey, model, baseUrl = 'https://api.openai.com', retry } = config
  // Normalize: many compatible endpoints are declared WITH a trailing `/v1`
  // (together, mistral, fireworks, openrouter `/api/v1`, …) while others are
  // declared without it. The default path appends `/v1/chat/completions`, so strip a
  // trailing `/v1` first to avoid a double `/v1/v1/...` (→ 404).
  const apiRoot = config.path === undefined ? baseUrl.replace(/\/v1\/?$/, '') : baseUrl
  const url = `${apiRoot.replace(/\/$/, '')}/${(config.path ?? '/v1/chat/completions').replace(/^\//, '')}`
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

  const capabilities: AdapterCapabilities = {
    streaming: true,
    tools: config.capabilities?.tools ?? true,
    // o1 / o3 models emit reasoning; older models don't. Accurate per-model
    // detection would need a model registry; 'true' is the safer default here.
    reasoning: config.capabilities?.reasoning ?? (model.startsWith('o1') || model.startsWith('o3')),
    multiModal: config.capabilities?.multiModal ?? /(^|\/)(gpt-[45]|o\d|gemini-|claude-(?:[3-9]|(?:sonnet|opus|haiku)-[3-9]))|vision/i.test(model),
    usage: true,
    ...config.capabilities,
  }
  return {
    capabilities,
    createSource: (request: AdapterRequest): StreamSource => {
      const body: Record<string, unknown> = {
        model,
        messages: toProviderMessages(request.messages, capabilities.multiModal),
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
        (signal) => {
          const headers = new Headers({ 'Content-Type': 'application/json' })
          if (apiKey) headers.set('Authorization', `Bearer ${apiKey}`)
          new Headers(config.headers).forEach((value, name) => headers.set(name, value))
          return (config.fetch ?? globalThis.fetch)(url, {
            method: 'POST',
            headers: Object.fromEntries([...headers].map(([name, value]) => [name === 'authorization' ? 'Authorization' : name, value])),
            body: JSON.stringify(body),
            signal,
          })
        },
        parseOpenAIStream,
        'OpenAI API',
        retry,
      )
    },
  }
}
