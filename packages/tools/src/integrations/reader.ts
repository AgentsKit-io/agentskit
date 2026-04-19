import { defineTool } from '@agentskit/core'
import type { HttpToolOptions } from './http'

export interface ReaderConfig extends HttpToolOptions {
  /** Jina Reader token (optional — public endpoint works anonymously, but rate-limited). */
  apiKey?: string
}

/**
 * Jina Reader — turn any URL into LLM-friendly plain text.
 * `https://r.jina.ai/<url>` returns Markdown-flavored extracted text
 * with no auth by default; pass an API key to raise your rate limit.
 */
export function readerFetch(config: ReaderConfig = {}) {
  const fetchImpl = config.fetch ?? globalThis.fetch
  const baseUrl = config.baseUrl ?? 'https://r.jina.ai'

  return defineTool({
    name: 'reader_fetch',
    description: 'Fetch a URL and return its text content, ready to feed into an LLM.',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    } as const,
    async execute({ url }) {
      const headers: Record<string, string> = {
        accept: 'text/plain',
        ...config.headers,
      }
      if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`
      const response = await fetchImpl(`${baseUrl}/${url as string}`, { headers })
      const text = await response.text()
      if (!response.ok) throw new Error(`reader ${response.status}: ${text.slice(0, 200)}`)
      return text
    },
  })
}

export function reader(config: ReaderConfig = {}) {
  return [readerFetch(config)]
}
