import { defineAction } from '../../contract'

export const shopifySearchProducts = defineAction({
  name: 'shopify_search_products',
  description: 'Search Shopify products by title or vendor.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { title: { type: 'string' }, vendor: { type: 'string' }, limit: { type: 'number' } },
  },
  async execute(args, { http }) {
    const result = await http<{ products?: Array<{ id: number; title: string; vendor: string; status: string }> }>({
      method: 'GET',
      path: 'products.json',
      query: {
        title: args.title ? String(args.title) : undefined,
        vendor: args.vendor ? String(args.vendor) : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 25,
      },
    })
    return result.products ?? []
  },
})

export const shopifyListOrders = defineAction({
  name: 'shopify_list_orders',
  description: 'List Shopify orders, newest first. Filter by status.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['open', 'closed', 'cancelled', 'any'] },
      financialStatus: { type: 'string' },
      limit: { type: 'number' },
    },
  },
  async execute(args, { http }) {
    const result = await http<{
      orders?: Array<{ id: number; name: string; email: string; total_price: string; financial_status: string; fulfillment_status: string | null; created_at: string }>
    }>({
      method: 'GET',
      path: 'orders.json',
      query: {
        status: args.status ? String(args.status) : 'any',
        financial_status: args.financialStatus ? String(args.financialStatus) : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 25,
      },
    })
    return (result.orders ?? []).map((o) => ({
      id: o.id, name: o.name, email: o.email, total: o.total_price,
      financialStatus: o.financial_status, fulfillmentStatus: o.fulfillment_status, createdAt: o.created_at,
    }))
  },
})

export const shopifyActions = [shopifySearchProducts, shopifyListOrders]
