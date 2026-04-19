import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface CoinGeckoConfig extends HttpToolOptions {
  /** Optional pro API key — public endpoint works without one. */
  apiKey?: string
}

function opts(config: CoinGeckoConfig): HttpToolOptions {
  const headers: Record<string, string> = { ...config.headers }
  if (config.apiKey) headers['x-cg-pro-api-key'] = config.apiKey
  return {
    baseUrl: config.baseUrl ?? 'https://api.coingecko.com/api/v3',
    headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function coingeckoPrice(config: CoinGeckoConfig = {}) {
  const base = opts(config)
  return defineTool({
    name: 'coingecko_price',
    description: 'Get current price of one or more cryptocurrencies.',
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'string', description: 'Comma-separated coin ids, e.g. "bitcoin,ethereum"' },
        vs_currencies: { type: 'string', description: 'Comma-separated fiat/crypto, e.g. "usd,eur"' },
      },
      required: ['ids'],
    } as const,
    async execute({ ids, vs_currencies }) {
      const result = await httpJson<Record<string, Record<string, number>>>(base, {
        path: '/simple/price',
        query: { ids: String(ids), vs_currencies: vs_currencies ? String(vs_currencies) : 'usd' },
      })
      return result
    },
  })
}

export function coingeckoMarketChart(config: CoinGeckoConfig = {}) {
  const base = opts(config)
  return defineTool({
    name: 'coingecko_market_chart',
    description: 'Fetch historical price series for a coin.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Coin id, e.g. "bitcoin"' },
        vs_currency: { type: 'string' },
        days: { type: 'number', description: 'Days of history, e.g. 1, 7, 30, "max".' },
      },
      required: ['id'],
    } as const,
    async execute({ id, vs_currency, days }) {
      const result = await httpJson<{ prices: Array<[number, number]> }>(base, {
        path: `/coins/${String(id)}/market_chart`,
        query: {
          vs_currency: vs_currency ? String(vs_currency) : 'usd',
          days: days !== undefined ? String(days) : '7',
        },
      })
      return { prices: result.prices }
    },
  })
}

export function coingecko(config: CoinGeckoConfig = {}) {
  return [coingeckoPrice(config), coingeckoMarketChart(config)]
}
