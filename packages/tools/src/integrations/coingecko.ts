import type { ToolDefinition } from '@agentskit/core'
import { coingeckoIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/coingecko). */
export interface CoinGeckoConfig extends HttpToolOptions {
  /** Optional pro API key — public endpoint works without one. */
  apiKey?: string
}

function cfg(config: CoinGeckoConfig): ProjectionConfig {
  return {
    baseUrl: config.baseUrl,
    headers: { ...(config.apiKey ? { 'x-cg-pro-api-key': config.apiKey } : {}), ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function coingeckoPrice(config: CoinGeckoConfig = {}): ToolDefinition {
  return toToolDefinitions(coingeckoIntegration, cfg(config)).find((t) => t.name === 'coingecko_price')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function coingeckoMarketChart(config: CoinGeckoConfig = {}): ToolDefinition {
  return toToolDefinitions(coingeckoIntegration, cfg(config)).find((t) => t.name === 'coingecko_market_chart')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function coingecko(config: CoinGeckoConfig = {}): ToolDefinition[] {
  return toToolDefinitions(coingeckoIntegration, cfg(config))
}
