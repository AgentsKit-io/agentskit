import type { ToolDefinition } from '@agentskit/core'

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
  out = out.replace(/<!--[\s\S]*?-->/g, '')
  let prev: string
  do {
    prev = out
    out = out.replace(/<[^<>]*>/g, ' ')
  } while (out !== prev)
  return decodeEntities(out).replace(/\s+/g, ' ').trim()
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let out = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n < 0 || n > 255) return null
    out = (out << 8) | n
  }
  return out >>> 0
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return false
  const o1 = (n >>> 24) & 0xff
  const o2 = (n >>> 16) & 0xff
  // 0.0.0.0/8
  if (o1 === 0) return true
  // 10.0.0.0/8
  if (o1 === 10) return true
  // 127.0.0.0/8 loopback
  if (o1 === 127) return true
  // 169.254.0.0/16 link-local (incl. AWS IMDS)
  if (o1 === 169 && o2 === 254) return true
  // 172.16.0.0/12
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true
  // 192.168.0.0/16
  if (o1 === 192 && o2 === 168) return true
  // 100.64.0.0/10 CGNAT
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true
  return false
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower === '0:0:0:0:0:0:0:1' || lower === '0:0:0:0:0:0:0:0') return true
  // fc00::/7 unique-local
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true
  // fe80::/10 link-local
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true
  // IPv4-mapped: ::ffff:a.b.c.d
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1]!)
  return false
}

/**
 * Decide whether `host` resolves to a private/loopback/link-local
 * address. Sync host-literal checks are exact; for hostnames we resort
 * to DNS lookup via `node:dns/promises` when available. Conservatively
 * blocks on any DNS failure so a misconfigured resolver can't open the
 * SSRF gap by accident.
 */
async function isPrivateHost(host: string): Promise<boolean> {
  const stripped = host.replace(/^\[/, '').replace(/\]$/, '')
  // host literal IPv4?
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(stripped)) {
    return isPrivateIPv4(stripped)
  }
  // host literal IPv6?
  if (stripped.includes(':')) {
    return isPrivateIPv6(stripped)
  }
  const lower = stripped.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true
  if (lower === 'metadata.google.internal') return true
  if (lower === 'metadata.goog') return true
  // Resolve through DNS where possible.
  try {
    const dns = await import('node:dns/promises')
    const records = await dns.lookup(stripped, { all: true, verbatim: true })
    if (records.length === 0) return true
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address)) return true
      if (r.family === 6 && isPrivateIPv6(r.address)) return true
    }
    return false
  } catch {
    // No DNS available (edge runtime) or lookup failed — fail closed.
    return true
  }
}

async function gateHost(parsed: URL, opts: {
  allowPrivateHosts: boolean
  allowedHosts?: string[]
}): Promise<string | null> {
  const host = parsed.hostname
  if (opts.allowedHosts && opts.allowedHosts.length > 0) {
    if (!opts.allowedHosts.includes(host)) {
      return `Error: host "${host}" is not in allowedHosts`
    }
    return null
  }
  if (opts.allowPrivateHosts) return null
  if (await isPrivateHost(host)) {
    return `Error: host "${host}" resolves to a private/loopback/link-local address (SSRF blocked). Pass allowPrivateHosts:true or use allowedHosts to override for vetted internal targets.`
  }
  return null
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
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return `Error: unsupported protocol "${parsed.protocol}" — only http/https allowed`
          }
          const gateError = await gateHost(parsed, { allowPrivateHosts, allowedHosts })
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
