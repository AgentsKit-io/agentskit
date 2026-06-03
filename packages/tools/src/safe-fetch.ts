import { ToolError, ErrorCodes } from '@agentskit/core'

/**
 * Default-deny egress policy (ADR-0010). All outbound HTTP from tools should
 * pass through {@link safeFetch} / {@link checkEgress} so a model-supplied or
 * redirected URL cannot reach internal infrastructure (SSRF).
 */
export interface EgressPolicy {
  /**
   * Allow requests to private / loopback / link-local addresses. Off by
   * default so an agent can't reach AWS IMDS (169.254.169.254), the loopback
   * interface, or RFC1918 services. Enable only for vetted internal targets.
   */
  allowPrivateHosts?: boolean
  /**
   * Literal hostname allowlist. If set, every request (and redirect hop) must
   * match exactly — overrides `allowPrivateHosts`. Wildcards unsupported by design.
   */
  allowedHosts?: string[]
  /** Max redirects to follow; each hop is re-gated. Default 3. */
  maxRedirects?: number
}

const DEFAULT_MAX_REDIRECTS = 3

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

/** True if `ip` is an IPv4 address in a private/loopback/link-local/CGNAT range. */
export function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip)
  if (n === null) return false
  const o1 = (n >>> 24) & 0xff
  const o2 = (n >>> 16) & 0xff
  if (o1 === 0) return true // 0.0.0.0/8
  if (o1 === 10) return true // 10.0.0.0/8
  if (o1 === 127) return true // 127.0.0.0/8 loopback
  if (o1 === 169 && o2 === 254) return true // 169.254.0.0/16 link-local (AWS IMDS)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true // 172.16.0.0/12
  if (o1 === 192 && o2 === 168) return true // 192.168.0.0/16
  if (o1 === 100 && o2 >= 64 && o2 <= 127) return true // 100.64.0.0/10 CGNAT
  return false
}

/** True if `ip` is an IPv6 loopback / unique-local / link-local / mapped-private address. */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::1' || lower === '::') return true
  if (lower === '0:0:0:0:0:0:0:1' || lower === '0:0:0:0:0:0:0:0') return true
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true // fe80::/10 link-local
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIPv4(mapped[1]!)
  return false
}

/**
 * Decide whether `host` resolves to a private/loopback/link-local address.
 * Host literals are checked exactly; hostnames are resolved via
 * `node:dns/promises` when available. Fails closed on any DNS failure (e.g.
 * edge runtime) so a misconfigured resolver can't open the SSRF gap.
 */
export async function isPrivateHost(host: string): Promise<boolean> {
  const stripped = host.replace(/^\[/, '').replace(/\]$/, '')
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(stripped)) return isPrivateIPv4(stripped)
  if (stripped.includes(':')) return isPrivateIPv6(stripped)
  const lower = stripped.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true
  if (lower === 'metadata.google.internal') return true
  if (lower === 'metadata.goog') return true
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
    return true // no DNS / lookup failed — fail closed
  }
}

/**
 * Gate a parsed URL against an egress policy. Returns an error string when the
 * request must be blocked (caller can surface it verbatim), or `null` to allow.
 * Enforces http/https only and default-deny of private hosts.
 */
export async function checkEgress(parsed: URL, policy: EgressPolicy = {}): Promise<string | null> {
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Error: unsupported protocol "${parsed.protocol}" — only http/https allowed`
  }
  const host = parsed.hostname
  if (policy.allowedHosts && policy.allowedHosts.length > 0) {
    return policy.allowedHosts.includes(host) ? null : `Error: host "${host}" is not in allowedHosts`
  }
  if (policy.allowPrivateHosts) return null
  if (await isPrivateHost(host)) {
    return `Error: host "${host}" resolves to a private/loopback/link-local address (SSRF blocked). Pass allowPrivateHosts:true or use allowedHosts to override for vetted internal targets.`
  }
  return null
}

/**
 * `fetch` with default-deny egress (ADR-0010). Validates the URL and every
 * redirect hop against {@link checkEgress}; redirects are followed manually so
 * each target host is re-gated. Throws a `ToolError` (`AK_TOOL_INVALID_INPUT`)
 * when the policy blocks the request. Use for any tool that fetches a URL the
 * model can influence.
 */
export async function safeFetch(
  input: string,
  init: RequestInit = {},
  policy: EgressPolicy = {},
): Promise<Response> {
  const maxRedirects = policy.maxRedirects ?? DEFAULT_MAX_REDIRECTS
  let currentUrl = input
  let hops = 0
  while (hops <= maxRedirects) {
    let parsed: URL
    try {
      parsed = new URL(currentUrl)
    } catch {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: `invalid URL "${currentUrl}"` })
    }
    const blocked = await checkEgress(parsed, policy)
    if (blocked) throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: blocked })

    const r = await fetch(currentUrl, { ...init, redirect: 'manual' })
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location')
      if (!loc) return r
      try {
        currentUrl = new URL(loc, currentUrl).toString()
      } catch {
        throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: `invalid redirect target "${loc}"` })
      }
      hops++
      continue
    }
    return r
  }
  throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: `exceeded maxRedirects (${maxRedirects})` })
}
