import type { AdapterFactory } from '@agentskit/core'
import { openai, type OpenAIConfig } from './openai'

export interface OpenAICompatibleConfig extends OpenAIConfig {}

/** Transport configuration for endpoints with optional Bearer authentication. */
export interface OpenAICompatibleTransportConfig extends Omit<OpenAIConfig, 'apiKey'> {
  apiKey?: string
}

export function createOpenAICompatibleAdapter(defaultBaseUrl: string) {
  return function openAICompatibleAdapter(config: OpenAICompatibleConfig): AdapterFactory {
    return openai({
      ...config,
      baseUrl: config.baseUrl ?? defaultBaseUrl,
    })
  }
}

/** An OpenAI-compatible endpoint with explicit transport configuration. */
export function openaiCompatible(config: OpenAICompatibleTransportConfig): AdapterFactory {
  return openai({ ...config, apiKey: config.apiKey ?? '' })
}
