import { defineTool, type ToolDefinition } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface ShopifyConfig extends HttpToolOptions {
  /** Shop subdomain — `my-store.myshopify.com`. */
  shop: string
  /** Admin API access token (custom app token). */
  accessToken: string
  /** Admin REST API version. Default `2024-10`. */
  apiVersion?: string
}

function opts(config: ShopifyConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? `https://${config.shop}/admin/api/${config.apiVersion ?? '2024-10'}/`,
    headers: { 'x-shopify-access-token': config.accessToken },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function shopifySearchProducts(config: ShopifyConfig) {
  return defineTool({
    name: 'shopify_search_products',
    description: 'Search Shopify products by title or vendor.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        vendor: { type: 'string' },
        limit: { type: 'number' },
      },
    } as const,
    async execute({ title, vendor, limit }) {
      const result = await httpJson<{
        products?: Array<{ id: number; title: string; vendor: string; status: string }>
      }>(opts(config), {
        method: 'GET',
        path: 'products.json',
        query: {
          title: title ? String(title) : undefined,
          vendor: vendor ? String(vendor) : undefined,
          limit: typeof limit === 'number' ? limit : 25,
        },
      })
      return result.products ?? []
    },
  })
}

export function shopifyListOrders(config: ShopifyConfig) {
  return defineTool({
    name: 'shopify_list_orders',
    description: 'List Shopify orders, newest first. Filter by status.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'closed', 'cancelled', 'any'] },
        financialStatus: { type: 'string' },
        limit: { type: 'number' },
      },
    } as const,
    async execute({ status, financialStatus, limit }) {
      const result = await httpJson<{
        orders?: Array<{
          id: number; name: string; email: string;
          total_price: string; financial_status: string;
          fulfillment_status: string | null; created_at: string;
        }>
      }>(opts(config), {
        method: 'GET',
        path: 'orders.json',
        query: {
          status: status ? String(status) : 'any',
          financial_status: financialStatus ? String(financialStatus) : undefined,
          limit: typeof limit === 'number' ? limit : 25,
        },
      })
      return (result.orders ?? []).map(o => ({
        id: o.id,
        name: o.name,
        email: o.email,
        total: o.total_price,
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        createdAt: o.created_at,
      }))
    },
  })
}

export function shopify(config: ShopifyConfig): ToolDefinition[] {
  return [
    shopifySearchProducts(config) as unknown as ToolDefinition,
    shopifyListOrders(config) as unknown as ToolDefinition,
  ]
}
