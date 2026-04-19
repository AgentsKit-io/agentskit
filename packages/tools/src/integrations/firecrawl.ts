import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface FirecrawlConfig extends HttpToolOptions {
  apiKey: string
}

function opts(config: FirecrawlConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://api.firecrawl.dev/v1',
    headers: { authorization: `Bearer ${config.apiKey}`, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

export function firecrawlScrape(config: FirecrawlConfig) {
  const base = opts(config)
  return defineTool({
    name: 'firecrawl_scrape',
    description: 'Scrape a URL and return its primary content as Markdown.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        only_main: { type: 'boolean', description: 'Strip navigation / footer / ads. Default true.' },
      },
      required: ['url'],
    } as const,
    async execute({ url, only_main }) {
      const result = await httpJson<{ data?: { markdown?: string; html?: string; metadata?: Record<string, unknown> } }>(
        base,
        {
          method: 'POST',
          path: '/scrape',
          body: {
            url,
            formats: ['markdown'],
            onlyMainContent: only_main ?? true,
          },
        },
      )
      return {
        markdown: result.data?.markdown ?? '',
        metadata: result.data?.metadata ?? {},
      }
    },
  })
}

export function firecrawlCrawl(config: FirecrawlConfig) {
  const base = opts(config)
  return defineTool({
    name: 'firecrawl_crawl',
    description: 'Start a crawl job rooted at a URL; returns the job id to poll for results.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['url'],
    } as const,
    async execute({ url, limit }) {
      const result = await httpJson<{ id?: string; jobId?: string; url?: string }>(base, {
        method: 'POST',
        path: '/crawl',
        body: { url, limit: limit ?? 50 },
      })
      return { jobId: result.id ?? result.jobId, statusUrl: result.url }
    },
  })
}

export function firecrawl(config: FirecrawlConfig) {
  return [firecrawlScrape(config), firecrawlCrawl(config)]
}
