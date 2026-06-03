import type { ToolDefinition } from '@agentskit/core'
import { checkEgress } from './safe-fetch'

export interface FetchUrlConfig {
  /** Maximum bytes to read from the response body. Default: 200 KB. */
  maxBytes?: number
  /** Request timeout in ms. Default: 15000. */
  timeoutMs?: number
  /** Header value for `User-Agent`. Default: `AgentsKit/1.0`. */
  userAgent?: string
  /**
   * Allow requests to private/loopback/link-local addresses. Off by
   * default so an agent can't reach AWS IMDS (169.254.169.254), the
   * loopback interface, or internal RFC1918 services. Set true only
   * when the tool runs against a vetted internal target.
   */
  allowPrivateHosts?: boolean
  /**
   * Max redirects to follow. Each hop's resolved host is re-checked
   * against `allowPrivateHosts` to block redirect-based SSRF. Default 3.
   */
  maxRedirects?: number
  /**
   * Hostname allowlist. If set, every request (and every redirect hop)
   * must match a literal hostname in this list — overrides
   * `allowPrivateHosts`. Wildcards are not supported by design.
   */
  allowedHosts?: string[]
}

const DEFAULT_MAX_BYTES = 200 * 1024
const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_REDIRECTS = 3

/** Decode a small set of HTML entities. `&amp;` is decoded last so a
 *  double-encoded entity (`&amp;lt;`) can't be collapsed into a live `<`. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
}

/** Strip a tag pair repeatedly until stable, so a nested/overlapping
 *  construct (`<scr<script>ipt>`) can't survive a single pass. */
function stripPair(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi')
  let prev: string
  do {
    prev = html
    html = html.replace(re, '')
  } while (html !== prev)
  return html
}

function stripHtml(html: string): string {
  let out = stripPair(html, 'script')
  out = stripPair(out, 'style')
  // Strip comments and tags in one loop until stable, so a construct
  // that re-forms a `<!--` or a `<tag>` after one pass can't survive.
  let prev: string
  do {
    prev = out
    // `(?:-->|$)` also drops an unterminated `<!--` (no closing `-->`).
    out = out.replace(/<!--[\s\S]*?(?:-->|$)/g, '').replace(/<[^<>]*>/g, ' ')
  } while (out !== prev)
  return decodeEntities(out).replace(/\s+/g, ' ').trim()
}

/**
 * Tool: fetch a URL and return its text content.
 *
 * - Enforces HTTPS/HTTP only (no file://, ftp://, etc).
 * - SSRF-gated: every hop's resolved host is checked against private /
 *   loopback / link-local ranges and (when configured) an allowlist.
 * - Redirects are followed manually so the target host of each hop is
 *   re-validated; the platform's automatic redirect is disabled.
 * - Caps response size via `maxBytes` so a huge page can't flood the
 *   model's context window or blow memory.
 * - Strips HTML tags by default; set `raw: true` to get the body verbatim.
 */
export function fetchUrl(config: FetchUrlConfig = {}): ToolDefinition {
  const {
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    userAgent = 'AgentsKit/1.0',
    allowPrivateHosts = false,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    allowedHosts,
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
      const input = String(args.url ?? '').trim()
      const raw = Boolean(args.raw)
      if (!input) return 'Error: url is required'

      let currentUrl = input
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        let response: Response | null = null
        let hops = 0
        while (hops <= maxRedirects) {
          let parsed: URL
          try {
            parsed = new URL(currentUrl)
          } catch {
            return `Error: invalid URL "${currentUrl}"`
          }
          const gateError = await checkEgress(parsed, { allowPrivateHosts, allowedHosts })
          if (gateError) return gateError

          const r = await fetch(currentUrl, {
            headers: { 'User-Agent': userAgent, 'Accept': 'text/html,text/plain,*/*' },
            signal: controller.signal,
            redirect: 'manual',
          })

          if (r.status >= 300 && r.status < 400) {
            const loc = r.headers.get('location')
            if (!loc) {
              response = r
              break
            }
            try {
              currentUrl = new URL(loc, currentUrl).toString()
            } catch {
              return `Error: invalid redirect target "${loc}"`
            }
            hops++
            if (hops > maxRedirects) {
              return `Error: exceeded maxRedirects (${maxRedirects})`
            }
            continue
          }
          response = r
          break
        }
        if (!response) return `Error: exceeded maxRedirects (${maxRedirects})`
        if (!response.ok) return `Error: ${response.status} ${response.statusText} for ${currentUrl}`

        const contentType = response.headers.get('content-type') ?? ''
        const reader = response.body?.getReader()
        if (!reader) return `Error: empty response body for ${currentUrl}`

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
        return `URL: ${currentUrl}\nContent-Type: ${contentType || 'unknown'}\n\n${text}${truncated}`
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return `Error fetching ${currentUrl}: ${message}`
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
