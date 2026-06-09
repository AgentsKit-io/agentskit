import type { ToolDefinition } from '@agentskit/core'
import { mapsIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/maps). */
export interface MapsConfig extends HttpToolOptions {
  /** User-Agent — Nominatim requires one identifying your app. */
  userAgent?: string
}

function cfg(config: MapsConfig): ProjectionConfig {
  return {
    baseUrl: config.baseUrl,
    headers: { ...(config.userAgent ? { 'user-agent': config.userAgent } : {}), ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function mapsGeocode(config: MapsConfig = {}): ToolDefinition {
  return toToolDefinitions(mapsIntegration, cfg(config)).find((t) => t.name === 'maps_geocode')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function mapsReverseGeocode(config: MapsConfig = {}): ToolDefinition {
  return toToolDefinitions(mapsIntegration, cfg(config)).find((t) => t.name === 'maps_reverse_geocode')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function maps(config: MapsConfig = {}): ToolDefinition[] {
  return toToolDefinitions(mapsIntegration, cfg(config))
}
