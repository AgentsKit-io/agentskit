import type { ToolDefinition } from '@agentskit/core'

export interface FetchUrlConfig {
  /** Maximum bytes to read from the response body. Default: 200 KB. */
  maxBytes?: number
  /** Request timeout in ms. Default: 15000. */
  timeoutMs?: number
  /** Header value for `User-Agent`. Default: `AgentsKit/1.0`. */
  userAgent?: string
}

const DEFAULT_MAX_BYTES = 200 * 1024
const DEFAULT_TIMEOUT_MS = 15_000

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Tool: fetch a URL and return its text content.
 *
 * - Enforces HTTPS/HTTP only (no file://, ftp://, etc).
 * - Caps response size via `maxBytes` so a huge page can't flood the
 *   model's context window or blow memory.
 * - Strips HTML tags by default; set `raw: true` to get the body verbatim.
 */
export function fetchUrl(config: FetchUrlConfig = {}): ToolDefinition {
  const {
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    userAgent = 'AgentsKit/1.0',
  } = config

  return {
    name: 'fetch_url',
    description:
      'Fetch the contents of a URL and return it as text. Use for reading docs, articles, or API responses.',
    tags: ['web', 'fetch'],
    category: 'retrieval',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch (http or https)' },
        raw: {
          type: 'boolean',
          description: 'If true, return the response body without HTML stripping. Default: false.',
        },
      },
      required: ['url'],
    },
    execute: async (args) => {
      const url = String(args.url ?? '').trim()
      const raw = Boolean(args.raw)
      if (!url) return 'Error: url is required'

      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return `Error: invalid URL "${url}"`
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return `Error: unsupported protocol "${parsed.protocol}" — only http/https allowed`
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': userAgent, 'Accept': 'text/html,text/plain,*/*' },
          signal: controller.signal,
        })
        if (!response.ok) return `Error: ${response.status} ${response.statusText} for ${url}`

        const contentType = response.headers.get('content-type') ?? ''
        const reader = response.body?.getReader()
        if (!reader) return `Error: empty response body for ${url}`

        const chunks: Uint8Array[] = []
        let bytes = 0
        while (bytes < maxBytes) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          bytes += value.byteLength
        }
        try {
          await reader.cancel()
        } catch {
          // already closed
        }

        const body = new TextDecoder('utf-8').decode(concat(chunks, Math.min(bytes, maxBytes)))
        const isHtml = contentType.includes('html') || /<html[\s>]/i.test(body)
        const text = raw || !isHtml ? body : stripHtml(body)
        const truncated = bytes >= maxBytes ? `\n\n[truncated at ${maxBytes} bytes]` : ''
        return `URL: ${url}\nContent-Type: ${contentType || 'unknown'}\n\n${text}${truncated}`
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return `Error fetching ${url}: ${message}`
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

function concat(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const out = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    const remaining = totalBytes - offset
    if (remaining <= 0) break
    const slice = chunk.byteLength <= remaining ? chunk : chunk.subarray(0, remaining)
    out.set(slice, offset)
    offset += slice.byteLength
  }
  return out
}
