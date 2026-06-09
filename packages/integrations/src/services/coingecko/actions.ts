import { defineAction } from '../../contract'

export const coingeckoPrice = defineAction({
  name: 'coingecko_price',
  description: 'Get current price of one or more cryptocurrencies.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      ids: { type: 'string', description: 'Comma-separated coin ids, e.g. "bitcoin,ethereum"' },
      vs_currencies: { type: 'string', description: 'Comma-separated fiat/crypto, e.g. "usd,eur"' },
    },
    required: ['ids'],
  },
  async execute(args, { http }) {
    return http<Record<string, Record<string, number>>>({
      path: '/simple/price',
      query: { ids: String(args.ids), vs_currencies: args.vs_currencies ? String(args.vs_currencies) : 'usd' },
    })
  },
})

export const coingeckoMarketChart = defineAction({
  name: 'coingecko_market_chart',
  description: 'Fetch historical price series for a coin.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Coin id, e.g. "bitcoin"' },
      vs_currency: { type: 'string' },
      days: { type: 'number', description: 'Days of history, e.g. 1, 7, 30, "max".' },
    },
    required: ['id'],
  },
  async execute(args, { http }) {
    const result = await http<{ prices: Array<[number, number]> }>({
      path: `/coins/${String(args.id)}/market_chart`,
      query: { vs_currency: args.vs_currency ? String(args.vs_currency) : 'usd', days: args.days !== undefined ? String(args.days) : '7' },
    })
    return { prices: result.prices }
  },
})

export const coingeckoActions = [coingeckoPrice, coingeckoMarketChart]
