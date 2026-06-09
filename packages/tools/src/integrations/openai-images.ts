import type { ToolDefinition } from '@agentskit/core'
import { openaiImagesIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/openai-images). */
export interface OpenAIImagesConfig extends HttpToolOptions {
  apiKey: string
  /** Default model id. 'gpt-image-1' is the current multimodal image model. */
  model?: string
}

function cfg(config: OpenAIImagesConfig): ProjectionConfig {
  return { credential: config.apiKey, config: { model: config.model }, baseUrl: config.baseUrl, headers: config.headers, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function openaiImagesGenerate(config: OpenAIImagesConfig): ToolDefinition {
  return toToolDefinitions(openaiImagesIntegration, cfg(config)).find((t) => t.name === 'openai_image_generate')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function openaiImages(config: OpenAIImagesConfig): ToolDefinition[] {
  return toToolDefinitions(openaiImagesIntegration, cfg(config))
}
