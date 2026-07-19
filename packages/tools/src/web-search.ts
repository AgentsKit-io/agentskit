import { ErrorCodes, ToolError } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'
import { safeFetch } from './safe-fetch'

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

export type WebSearchProvider = 'auto' | 'serper' | 'tavily' | 'duckduckgo'

export interface WebSearchConfig {
  /**
   * Which backend to use. `'auto'` (default) picks the best available:
   * Serper if `SERPER_API_KEY` is set, Tavily if `TAVILY_API_KEY` is set,
   * otherwise falls back to an unauthenticated DuckDuckGo HTML scrape.
   */
  provider?: WebSearchProvider
  apiKey?: string
  maxResults?: number
  /** Custom search function — overrides every other path. */
  search?: (query: string) => Promise<WebSearchResult[]>
}

const URL_RE = /^https?:\/\//i
const SNIPPET_MAX = 600

async function serperSearch(query: string, apiKey: string, maxResults: number): Promise<WebSearchResult[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
  })
  if (!response.ok) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `Serper API error: ${response.status}`,
    })
  }

  const data = await response.json() as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>
  }

  return (data.organic ?? []).map(r => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }))
}

async function tavilySearch(query: string, apiKey: string, maxResults: number): Promise<WebSearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, include_answer: false }),
  })
  if (!response.ok) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `Tavily API error: ${response.status}`,
    })
  }

  const data = await response.json() as {
    results?: Array<{ title?: string; url?: string; content?: string }>
  }

  return (data.results ?? []).map(r => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.content ?? '',
  }))
}

/**
 * Unauthenticated DuckDuckGo HTML scrape. Best-effort; HTML format may
 * change at any time. Returns an empty array if parsing fails.
 */
async function duckDuckGoHtmlSearch(query: string, maxResults: number): Promise<WebSearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AgentsKit/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!response.ok) return []

  const html = await response.text()
  const results: WebSearchResult[] = []

  const itemRe = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g
  for (const match of html.matchAll(itemRe)) {
    if (results.length >= maxResults) break
    results.push({
      title: stripTags(match[2]).trim(),
      url: decodeDuckUrl(match[1]),
      snippet: stripTags(match[3]).trim().slice(0, SNIPPET_MAX),
    })
  }

  return results
}

function decodeDuckUrl(raw: string): string {
  const match = raw.match(/uddg=([^&]+)/)
  if (match) {
    try {
      return decodeURIComponent(match[1])
    } catch {
      // fall through
    }
  }
  return raw
}

function stripTags(html: string): string {
  let out = html
  let prev: string
  do {
    prev = out
    out = out.replace(/<[^<>]*>/g, '')
  } while (out !== prev)
  // Decode entities; `&amp;` last so `&amp;lt;` can't collapse into `<`.
  return out
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
}

/**
 * Final fallback: if the query looks like a URL, fetch it directly and
 * return the page title + a text snippet. Lets the tool still produce
 * something useful when every search backend is unavailable.
 * Model-controlled URLs go through {@link safeFetch} so the initial host
 * and every redirect hop are egress-gated (ADR-0010).
 */
async function fetchUrlAsResult(url: string): Promise<WebSearchResult[]> {
  try {
    const response = await safeFetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentsKit/1.0)' },
    })
    if (!response.ok) return []
    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : url
    const text = stripTags(html).slice(0, SNIPPET_MAX * 2)
    return [{ title, url, snippet: text }]
  } catch (err) {
    // Surface egress rejections as readable errors; other failures stay empty.
    if (err instanceof ToolError) throw err
    return []
  }
}

function resolveBackend(
  provider: WebSearchProvider,
  explicitApiKey: string | undefined,
): { backend: WebSearchProvider; apiKey?: string } {
  if (provider !== 'auto') return { backend: provider, apiKey: explicitApiKey }

  const serperKey = explicitApiKey ?? process.env.SERPER_API_KEY
  if (serperKey) return { backend: 'serper', apiKey: serperKey }

  const tavilyKey = process.env.TAVILY_API_KEY
  if (tavilyKey) return { backend: 'tavily', apiKey: tavilyKey }

  return { backend: 'duckduckgo' }
}

export function webSearch(config: WebSearchConfig = {}): ToolDefinition {
  const { provider = 'auto', apiKey, maxResults = 5, search } = config

  return {
    name: 'web_search',
    description:
      'Search the web for information. Accepts a query or a URL. Returns titles, URLs, and snippets.',
    tags: ['web', 'search'],
    category: 'retrieval',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query or URL' },
      },
      required: ['query'],
    },
    execute: async (args) => {
      const query = String(args.query ?? '').trim()
      if (!query) return 'Error: query is required'

      if (search) {
        const results = await search(query)
        return formatResults(results, query)
      }

      if (URL_RE.test(query)) {
        try {
          const direct = await fetchUrlAsResult(query)
          if (direct.length > 0) return formatResults(direct, query)
        } catch (err) {
          if (err instanceof ToolError) {
            return err.message.startsWith('Error:') ? err.message : `Error: ${err.message}`
          }
          throw err
        }
      }

      const { backend, apiKey: resolvedKey } = resolveBackend(provider, apiKey)

      // Explicit provider without the required key — surface an error instead
      // of silently falling through. Users who pinned a backend want to know.
      if (provider === 'serper' && !resolvedKey) {
        return 'Error: Serper provider requires apiKey (pass { apiKey } or set SERPER_API_KEY)'
      }
      if (provider === 'tavily' && !resolvedKey) {
        return 'Error: Tavily provider requires apiKey (pass { apiKey } or set TAVILY_API_KEY)'
      }

      try {
        let results: WebSearchResult[] = []
        if (backend === 'serper' && resolvedKey) {
          results = await serperSearch(query, resolvedKey, maxResults)
        } else if (backend === 'tavily' && resolvedKey) {
          results = await tavilySearch(query, resolvedKey, maxResults)
        } else {
          results = await duckDuckGoHtmlSearch(query, maxResults)
        }

        if (results.length > 0) return formatResults(results, query)
      } catch {
        // fall through
      }

      return `No results found for "${query}"`
    },
  }
}

function formatResults(results: WebSearchResult[], query: string): string {
  if (results.length === 0) return `No results found for "${query}"`
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join('\n\n')
}
