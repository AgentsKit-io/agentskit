import type { ToolDefinition } from '@agentskit/core'
import { figmaIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/figma). */
export interface FigmaConfig extends HttpToolOptions {
  /** Personal access token. */
  accessToken: string
}

function cfg(config: FigmaConfig): ProjectionConfig {
  return { credential: config.accessToken, baseUrl: config.baseUrl, headers: config.headers, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function figmaGetFile(config: FigmaConfig): ToolDefinition {
  return toToolDefinitions(figmaIntegration, cfg(config)).find((t) => t.name === 'figma_get_file')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function figmaExportImages(config: FigmaConfig): ToolDefinition {
  return toToolDefinitions(figmaIntegration, cfg(config)).find((t) => t.name === 'figma_export_images')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function figma(config: FigmaConfig): ToolDefinition[] {
  return toToolDefinitions(figmaIntegration, cfg(config))
}
