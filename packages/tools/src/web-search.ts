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
  /** Overall deadline for provider and custom-search work. Defaults to 15s. */
  timeoutMs?: number
  /** Maximum provider response body size. Defaults to 2 MiB. */
  maxResponseBytes?: number
  /** Caller cancellation signal. */
  signal?: AbortSignal
  /** Custom search function — overrides every other path. */
  search?: (query: string) => Promise<WebSearchResult[]>
}

const URL_RE = /^https?:\/\//i
const SNIPPET_MAX = 600
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024

interface SearchRuntimeConfig {
  timeoutMs: number
  maxResponseBytes: number
  signal?: AbortSignal
}

async function readResponseText(response: Response, maxBytes: number): Promise<string> {
  const headers = (response as Response & { headers?: Headers }).headers
  const contentLength = headers?.get?.('content-length')
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `search response exceeds maxResponseBytes (${maxBytes})` })
  }
  const body = (response as Response & { body?: ReadableStream<Uint8Array> | null }).body
  if (!body) {
    const text = 'text' in response && typeof response.text === 'function'
      ? await response.text()
      : JSON.stringify(await (response as Response & { json: () => Promise<unknown> }).json())
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `search response exceeds maxResponseBytes (${maxBytes})` })
    }
    return text
  }
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    total += next.value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `search response exceeds maxResponseBytes (${maxBytes})` })
    }
    chunks.push(next.value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

async function requestText(
  url: string,
  init: RequestInit,
  config: SearchRuntimeConfig,
  safe = false,
): Promise<{ response: Response; text: string }> {
  const controller = new AbortController()
  const abort = () => controller.abort(config.signal?.reason)
  if (config.signal?.aborted) abort()
  config.signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  try {
    const response = safe
      ? await safeFetch(url, { ...init, signal: controller.signal })
      : await fetch(url, { ...init, signal: controller.signal })
    return { response, text: await readResponseText(response, config.maxResponseBytes) }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `web search timed out after ${config.timeoutMs}ms` })
    }
    throw error
  } finally {
    clearTimeout(timer)
    config.signal?.removeEventListener('abort', abort)
  }
}

async function withDeadline<T>(work: Promise<T>, config: SearchRuntimeConfig): Promise<T> {
  if (config.signal?.aborted) throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'web search aborted' })
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: `web search timed out after ${config.timeoutMs}ms` })), config.timeoutMs)
    const abort = () => reject(new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'web search aborted' }))
    config.signal?.addEventListener('abort', abort, { once: true })
    work.then(resolve, reject).finally(() => {
      clearTimeout(timer)
      config.signal?.removeEventListener('abort', abort)
    })
  })
}

async function serperSearch(query: string, apiKey: string, maxResults: number, config: SearchRuntimeConfig): Promise<WebSearchResult[]> {
  const { response, text } = await requestText('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: maxResults }),
  }, config)
  if (!response.ok) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `Serper API error: ${response.status}`,
    })
  }

  const data = JSON.parse(text) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>
  }

  return (data.organic ?? []).map(r => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }))
}

async function tavilySearch(query: string, apiKey: string, maxResults: number, config: SearchRuntimeConfig): Promise<WebSearchResult[]> {
  const { response, text } = await requestText('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults, include_answer: false }),
  }, config)
  if (!response.ok) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `Tavily API error: ${response.status}`,
    })
  }

  const data = JSON.parse(text) as {
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
async function duckDuckGoHtmlSearch(query: string, maxResults: number, config: SearchRuntimeConfig): Promise<WebSearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
  const { response, text: html } = await requestText(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AgentsKit/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  }, config)
  if (!response.ok) return []

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
async function fetchUrlAsResult(url: string, config: SearchRuntimeConfig): Promise<WebSearchResult[]> {
  try {
    const { response, text: html } = await requestText(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentsKit/1.0)' },
    }, config, true)
    if (!response.ok) return []
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
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxResponseBytes = config.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || !Number.isInteger(maxResponseBytes) || maxResponseBytes <= 0) {
    throw new Error('webSearch: timeoutMs and maxResponseBytes must be positive integers')
  }
  const runtime = { timeoutMs, maxResponseBytes, signal: config.signal }

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
        const results = await withDeadline(search(query), runtime)
        return formatResults(results, query)
      }

      if (URL_RE.test(query)) {
        try {
          const direct = await fetchUrlAsResult(query, runtime)
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
          results = await serperSearch(query, resolvedKey, maxResults, runtime)
        } else if (backend === 'tavily' && resolvedKey) {
          results = await tavilySearch(query, resolvedKey, maxResults, runtime)
        } else {
          results = await duckDuckGoHtmlSearch(query, maxResults, runtime)
        }

        if (results.length > 0) return formatResults(results, query)
      } catch (error) {
        if (error instanceof ToolError && /timed out|aborted|exceeds maxResponseBytes/.test(error.message)) {
          return `Error: ${error.message}`
        }
        // fall through for ordinary provider outages
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
