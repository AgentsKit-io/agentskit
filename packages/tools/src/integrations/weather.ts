import type { ToolDefinition } from '@agentskit/core'
import { weatherIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/weather). */
export interface WeatherConfig extends HttpToolOptions {
  /** OpenWeatherMap API key. */
  apiKey: string
}

function cfg(config: WeatherConfig): ProjectionConfig {
  return { config: { apiKey: config.apiKey }, baseUrl: config.baseUrl, headers: config.headers, timeoutMs: config.timeoutMs, fetch: config.fetch }
}

/** @deprecated import from `@agentskit/integrations`. */
export function weatherCurrent(config: WeatherConfig): ToolDefinition {
  return toToolDefinitions(weatherIntegration, cfg(config)).find((t) => t.name === 'weather_current')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function weather(config: WeatherConfig): ToolDefinition[] {
  return toToolDefinitions(weatherIntegration, cfg(config))
}
