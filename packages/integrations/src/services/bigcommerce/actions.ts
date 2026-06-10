import { defineAction } from '../../contract'

function store(config: unknown): string {
  return (config as { storeHash: string }).storeHash
}

export const bigcommerceListProducts = defineAction({
  name: 'bigcommerce_list_products',
  description: 'List BigCommerce catalog products.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { keyword: { type: 'string' }, limit: { type: 'number' } },
  },
  async execute(args, { http, config }) {
    const result = await http<{ data?: Array<{ id: number; name: string; sku: string; price: number }> }>({
      method: 'GET',
      path: `/stores/${store(config)}/v3/catalog/products`,
      query: { keyword: args.keyword ? String(args.keyword) : undefined, limit: typeof args.limit === 'number' ? args.limit : 50 },
    })
    return (result.data ?? []).map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price }))
  },
})

export const bigcommerceListOrders = defineAction({
  name: 'bigcommerce_list_orders',
  description: 'List BigCommerce orders.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { status_id: { type: 'number' }, limit: { type: 'number' } },
  },
  async execute(args, { http, config }) {
    const result = await http<Array<{ id: number; status: string; total_inc_tax: string; date_created: string }>>({
      method: 'GET',
      path: `/stores/${store(config)}/v2/orders`,
      query: { status_id: typeof args.status_id === 'number' ? args.status_id : undefined, limit: typeof args.limit === 'number' ? args.limit : 50 },
    })
    return (result ?? []).map((o) => ({ id: o.id, status: o.status, total: o.total_inc_tax, createdAt: o.date_created }))
  },
})

export const bigcommerceActions = [bigcommerceListProducts, bigcommerceListOrders]
