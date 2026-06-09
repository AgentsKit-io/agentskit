import type { ToolDefinition } from '@agentskit/core'
import { whisperIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/whisper). */
export interface WhisperConfig extends HttpToolOptions {
  apiKey: string
  /** Default model — 'whisper-1' for legacy, 'gpt-4o-mini-transcribe' for newer. */
  model?: string
}

function cfg(config: WhisperConfig): ProjectionConfig {
  return { config: { apiKey: config.apiKey, model: config.model, baseUrl: config.baseUrl, headers: config.headers }, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function whisperTranscribe(config: WhisperConfig): ToolDefinition {
  return toToolDefinitions(whisperIntegration, cfg(config)).find((t) => t.name === 'whisper_transcribe')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function whisper(config: WhisperConfig): ToolDefinition[] {
  return toToolDefinitions(whisperIntegration, cfg(config))
}
