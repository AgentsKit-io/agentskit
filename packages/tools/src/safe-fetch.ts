import { ConfigError, ToolError, ErrorCodes } from '@agentskit/core'
import { assertPublicUrl, classifyAddress } from '@agentskit/net'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Default-deny egress policy (ADR-0010). All outbound HTTP from tools should
 * pass through {@link safeFetch} / {@link checkEgress} so a model-supplied or
 * redirected URL cannot reach internal infrastructure (SSRF).
 */
export interface EgressPolicy {
  /**
   * Allow requests to any non-public address. Off by default so an agent
   * cannot reach private, reserved, loopback, link-local, or metadata targets.
   * Enable only for vetted internal targets.
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

function normalizeDecimalIPv4(ip: string): string | null {
  const parts = ip.split('.')
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return null
  const octets = parts.map(Number)
  if (octets.some(octet => !Number.isInteger(octet) || octet > 255)) return null
  return octets.join('.')
}

/**
 * True when a valid IPv4 address is not public unicast, as classified by
 * `@agentskit/net`. Invalid inputs return false; reserved and other non-public
 * ranges are now blocked alongside private, loopback, link-local and CGNAT.
 * Decimal dotted quads with leading-zero octets keep the previous base-10 behavior
 * (for example, `010.0.0.1` is classified as `10.0.0.1`).
 * @returns `false` for malformed or non-IPv4 input.
 */
export function isPrivateIPv4(ip: string): boolean {
  const normalized = normalizeDecimalIPv4(ip)
  if (normalized === null) return false
  const range = classifyAddress(normalized)
  return range !== undefined && range !== 'unicast'
}

/**
 * True when a valid IPv6 address is not public unicast, as classified by
 * `@agentskit/net`. Invalid inputs return false; mapped IPv4 and other
 * non-public ranges are blocked as well.
 * @returns `false` for malformed, bracketed, or non-IPv6 input.
 */
export function isPrivateIPv6(ip: string): boolean {
  if (isIP(ip) !== 6) return false
  const range = classifyAddress(ip)
  return range !== undefined && range !== 'unicast'
}

function normalizeMaxRedirects(value: number | undefined): number {
  const result = value ?? DEFAULT_MAX_REDIRECTS
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'maxRedirects must be a non-negative safe integer',
    })
  }
  return result
}

/**
 * Decide whether a hostname or bracketed/unbracketed IPv6 literal is non-public.
 * Delegates classification to `@agentskit/net`; Node DNS resolves every record
 * and any non-public address, malformed authority, or lookup failure is blocked.
 * Decimal dotted quads with leading zeroes keep the public helper's base-10
 * interpretation; `safeFetch` applies WHATWG URL normalization before this check.
 * This preflight does not pin the address used by the later fetch.
 * @param host Hostname or IPv6 literal, without credentials, path, or port.
 * @returns `true` for non-public or malformed input; `false` only for public hosts.
 */
export async function isPrivateHost(host: string): Promise<boolean> {
  const stripped = host.replace(/^\[/, '').replace(/\]$/, '')
  const normalizedHost = stripped.toLowerCase().replace(/\.$/, '')
  if (
    normalizedHost === 'localhost' || normalizedHost.endsWith('.localhost') ||
    normalizedHost === 'metadata.google.internal' || normalizedHost === 'metadata.goog'
  ) return true
  try {
    if (host !== host.trim() || /[\s\/?#@\\]/.test(host) || (isIP(stripped) !== 6 && stripped.includes(':'))) return true
    if (normalizeDecimalIPv4(stripped) !== null && isPrivateIPv4(stripped)) return true
    const urlHost = isIP(stripped) === 6 ? `[${stripped}]` : stripped
    const url = new URL(`http://${urlHost}/`)
    if (url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return true
    await assertPublicUrl(url, {
      lookup: async hostname => (await lookup(hostname, { all: true, verbatim: true })).map(record => record.address),
    })
    return false
  } catch {
    return true // no DNS / lookup failed — fail closed
  }
}

/**
 * Gate a parsed URL against an egress policy. Returns an error string when the
 * request must be blocked (caller can surface it verbatim), or `null` to allow.
 * Enforces http/https only and default-deny of non-public hosts.
 * @param parsed Parsed request URL.
 * @param policy Explicit vetted-host exceptions and redirect limits.
 * @returns The compatibility error string or `null` when allowed.
 */
export async function checkEgress(parsed: URL, policy: EgressPolicy = {}): Promise<string | null> {
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Error: unsupported protocol "${parsed.protocol}" — only http/https allowed`
  }
  const host = parsed.hostname
  if (policy.allowedHosts !== undefined) {
    const allowed = policy.allowedHosts.some(candidate =>
      typeof candidate === 'string' && candidate.toLowerCase() === host.toLowerCase())
    return allowed ? null : `Error: host "${host}" is not in allowedHosts`
  }
  if (policy.allowPrivateHosts) return null
  if (await isPrivateHost(host)) {
    return `Error: host "${host}" resolves to a private/loopback/link-local address (SSRF blocked). Pass allowPrivateHosts:true or use allowedHosts to override for vetted internal targets.`
  }
  return null
}

/**
 * Fetch an HTTP(S) URL with default-deny egress (ADR-0010), manually re-gating
 * each redirect. WHATWG URL canonicalization precedes host classification. DNS
 * is checked before each request but is not pinned to the later connection, so
 * DNS rebinding is not prevented.
 * @param input URL to fetch.
 * @param init Fetch options.
 * @param policy Explicit vetted-host exceptions and redirect limit.
 * @returns The final `Response`.
 * @throws {ToolError} AK_TOOL_INVALID_INPUT for an invalid or blocked URL, redirect, or hop limit.
 * @throws {ConfigError} AK_CONFIG_INVALID when `maxRedirects` is invalid.
 * @example
 * ```ts
 * import { safeFetch } from '@agentskit/tools'
 * const response = await safeFetch('https://example.com/data')
 * ```
 */
export async function safeFetch(
  input: string,
  init: RequestInit = {},
  policy: EgressPolicy = {},
): Promise<Response> {
  const maxRedirects = normalizeMaxRedirects(policy.maxRedirects)
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
      // Best-effort drain of the discarded redirect body so the connection can
      // be reused; cancellation failure must not skip egress re-gating.
      try {
        await r.body?.cancel()
      } catch {
        // ignore
      }
      try {
        const nextUrl = new URL(loc, currentUrl)
        if (nextUrl.origin !== parsed.origin) {
          const headers = new Headers(init.headers)
          for (const name of ['authorization', 'cookie', 'proxy-authorization']) headers.delete(name)
          init = { ...init, headers, credentials: 'omit', referrer: 'no-referrer' }
        }
        currentUrl = nextUrl.toString()
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
