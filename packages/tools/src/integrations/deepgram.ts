import type { ToolDefinition } from '@agentskit/core'
import { deepgramIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/deepgram). */
export interface DeepgramConfig extends HttpToolOptions {
  apiKey: string
}

function cfg(config: DeepgramConfig): ProjectionConfig {
  return { config: { apiKey: config.apiKey, baseUrl: config.baseUrl, headers: config.headers }, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function deepgramTranscribe(config: DeepgramConfig): ToolDefinition {
  return toToolDefinitions(deepgramIntegration, cfg(config)).find((t) => t.name === 'deepgram_transcribe')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function deepgram(config: DeepgramConfig): ToolDefinition[] {
  return toToolDefinitions(deepgramIntegration, cfg(config))
}
