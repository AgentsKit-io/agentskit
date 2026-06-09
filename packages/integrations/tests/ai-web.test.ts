import { describe, it, expect } from 'vitest'
import { openaiImagesIntegration } from '../src/services/openai-images/index'
import { firecrawlIntegration } from '../src/services/firecrawl/index'
import { mapsIntegration } from '../src/services/maps/index'
import { weatherIntegration } from '../src/services/weather/index'
import { coingeckoIntegration } from '../src/services/coingecko/index'
import { readerIntegration } from '../src/services/reader/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import type { ToolDefinition } from '@agentskit/core'

const ctx = (n: string) => ({ messages: [], call: { id: '1', name: n, args: {}, status: 'running' as const } })
const run = (t: ToolDefinition, a: Record<string, unknown>) => t.execute!(a, ctx(t.name))
function fakeFetch(h: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (i: RequestInfo | URL, init?: RequestInit) => h(String(i), init ?? {})) as typeof globalThis.fetch
}
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })

describe('openai-images', () => {
  it('valid + generates with model from config', async () => {
    expect(() => assertValidIntegration(openaiImagesIntegration)).not.toThrow()
    let body: Record<string, unknown> = {}
    const fetch = fakeFetch((_u, init) => { body = JSON.parse(String(init.body)); return json({ data: [{ url: 'http://img', revised_prompt: 'rp' }] }) })
    const [gen] = toToolDefinitions(openaiImagesIntegration, { credential: 'sk', config: { model: 'gpt-image-1' }, fetch })
    expect(await run(gen, { prompt: 'cat' })).toEqual([{ url: 'http://img', b64: undefined, revisedPrompt: 'rp' }])
    expect(body.model).toBe('gpt-image-1')
  })
})

describe('firecrawl', () => {
  it('valid + scrape/crawl', async () => {
    expect(() => assertValidIntegration(firecrawlIntegration)).not.toThrow()
    const fetch = fakeFetch((u) => u.includes('/scrape') ? json({ data: { markdown: '# t', metadata: { title: 'T' } } }) : json({ id: 'job1', url: 'su' }))
    const tools = toToolDefinitions(firecrawlIntegration, { credential: 'fc', fetch })
    expect(await run(tools.find((t) => t.name === 'firecrawl_scrape')!, { url: 'http://x' })).toEqual({ markdown: '# t', metadata: { title: 'T' } })
    expect(await run(tools.find((t) => t.name === 'firecrawl_crawl')!, { url: 'http://x' })).toEqual({ jobId: 'job1', statusUrl: 'su' })
  })
})

describe('maps', () => {
  it('valid + geocode/reverse with user-agent', async () => {
    expect(() => assertValidIntegration(mapsIntegration)).not.toThrow()
    let ua = ''
    const fetch = fakeFetch((u, init) => { ua = String((init.headers as Record<string, string>)['user-agent']); return u.includes('/reverse') ? json({ display_name: 'Place', address: { city: 'X' } }) : json([{ lat: '1.5', lon: '2.5', display_name: 'P' }]) })
    const tools = toToolDefinitions(mapsIntegration, { config: {}, fetch })
    expect(await run(tools.find((t) => t.name === 'maps_geocode')!, { query: 'paris' })).toEqual({ lat: 1.5, lon: 2.5, label: 'P' })
    expect(ua).toBe('agentskit-maps/1.0')
    expect(await run(tools.find((t) => t.name === 'maps_reverse_geocode')!, { lat: 1, lon: 2 })).toEqual({ label: 'Place', address: { city: 'X' } })
  })
})

describe('weather', () => {
  it('valid + appid query from config', async () => {
    expect(() => assertValidIntegration(weatherIntegration)).not.toThrow()
    let url = ''
    const fetch = fakeFetch((u) => { url = u; return json({ name: 'Berlin', weather: [{ description: 'clear', main: 'Clear' }], main: { temp: 20, humidity: 50 }, wind: { speed: 3 } }) })
    const [cur] = toToolDefinitions(weatherIntegration, { config: { apiKey: 'owm' }, fetch })
    expect(await run(cur, { city: 'Berlin' })).toEqual({ location: 'Berlin', summary: 'clear', condition: 'Clear', temperature: 20, humidity: 50, windSpeed: 3 })
    expect(url).toContain('appid=owm')
  })
})

describe('coingecko', () => {
  it('valid + price/chart + optional pro header', async () => {
    expect(() => assertValidIntegration(coingeckoIntegration)).not.toThrow()
    let pro = ''
    const fetch = fakeFetch((u, init) => { pro = String((init.headers as Record<string, string>)['x-cg-pro-api-key'] ?? ''); return u.includes('market_chart') ? json({ prices: [[1, 2]] }) : json({ bitcoin: { usd: 50000 } }) })
    const tools = toToolDefinitions(coingeckoIntegration, { config: {}, headers: { 'x-cg-pro-api-key': 'pk' }, fetch })
    expect(await run(tools.find((t) => t.name === 'coingecko_price')!, { ids: 'bitcoin' })).toEqual({ bitcoin: { usd: 50000 } })
    expect(pro).toBe('pk')
    expect(await run(tools.find((t) => t.name === 'coingecko_market_chart')!, { id: 'bitcoin' })).toEqual({ prices: [[1, 2]] })
  })
})

describe('reader', () => {
  it('valid + fetches text via custom url', async () => {
    expect(() => assertValidIntegration(readerIntegration)).not.toThrow()
    let url = ''; let auth = ''
    const fetch = fakeFetch((u, init) => { url = u; auth = String((init.headers as Record<string, string>).authorization ?? ''); return new Response('extracted text', { status: 200 }) })
    const [rf] = toToolDefinitions(readerIntegration, { config: { apiKey: 'jk' }, fetch })
    expect(await run(rf, { url: 'https://example.com' })).toBe('extracted text')
    expect(url).toBe('https://r.jina.ai/https://example.com'); expect(auth).toBe('Bearer jk')
  })
})
