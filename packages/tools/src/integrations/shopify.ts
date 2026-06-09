import type { ToolDefinition } from '@agentskit/core'
import { shopifyIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/shopify). */
export interface ShopifyConfig extends HttpToolOptions {
  /** Shop subdomain — `my-store.myshopify.com`. */
  shop: string
  /** Admin API access token (custom app token). */
  accessToken: string
  /** Admin REST API version. Default `2024-10`. */
  apiVersion?: string
}

function cfg(config: ShopifyConfig): ProjectionConfig {
  return {
    credential: config.accessToken,
    baseUrl: config.baseUrl ?? `https://${config.shop}/admin/api/${config.apiVersion ?? '2024-10'}/`,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function shopifySearchProducts(config: ShopifyConfig): ToolDefinition {
  return toToolDefinitions(shopifyIntegration, cfg(config)).find((t) => t.name === 'shopify_search_products')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function shopifyListOrders(config: ShopifyConfig): ToolDefinition {
  return toToolDefinitions(shopifyIntegration, cfg(config)).find((t) => t.name === 'shopify_list_orders')!
}
/** @deprecated import from `@agentskit/integrations`. */
export function shopify(config: ShopifyConfig): ToolDefinition[] {
  return toToolDefinitions(shopifyIntegration, cfg(config))
}
