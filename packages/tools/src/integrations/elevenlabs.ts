import type { ToolDefinition } from '@agentskit/core'
import { elevenlabsIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/elevenlabs). */
export interface ElevenLabsConfig extends HttpToolOptions {
  apiKey: string
}

function cfg(config: ElevenLabsConfig): ProjectionConfig {
  return { config: { apiKey: config.apiKey, baseUrl: config.baseUrl, headers: config.headers }, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function elevenlabsTts(config: ElevenLabsConfig): ToolDefinition {
  return toToolDefinitions(elevenlabsIntegration, cfg(config)).find((t) => t.name === 'elevenlabs_tts')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function elevenlabs(config: ElevenLabsConfig): ToolDefinition[] {
  return toToolDefinitions(elevenlabsIntegration, cfg(config))
}
