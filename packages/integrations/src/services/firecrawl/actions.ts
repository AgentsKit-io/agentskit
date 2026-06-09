import { defineAction } from '../../contract'

export const firecrawlScrape = defineAction({
  name: 'firecrawl_scrape',
  description: 'Scrape a URL and return its primary content as Markdown.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
      only_main: { type: 'boolean', description: 'Strip navigation / footer / ads. Default true.' },
    },
    required: ['url'],
  },
  async execute(args, { http }) {
    const result = await http<{ data?: { markdown?: string; html?: string; metadata?: Record<string, unknown> } }>({
      method: 'POST',
      path: '/scrape',
      body: { url: args.url, formats: ['markdown'], onlyMainContent: args.only_main ?? true },
    })
    return { markdown: result.data?.markdown ?? '', metadata: result.data?.metadata ?? {} }
  },
})

export const firecrawlCrawl = defineAction({
  name: 'firecrawl_crawl',
  description: 'Start a crawl job rooted at a URL; returns the job id to poll for results.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { url: { type: 'string' }, limit: { type: 'number' } },
    required: ['url'],
  },
  async execute(args, { http }) {
    const result = await http<{ id?: string; jobId?: string; url?: string }>({
      method: 'POST',
      path: '/crawl',
      body: { url: args.url, limit: (args.limit as number) ?? 50 },
    })
    return { jobId: result.id ?? result.jobId, statusUrl: result.url }
  },
})

export const firecrawlActions = [firecrawlScrape, firecrawlCrawl]
