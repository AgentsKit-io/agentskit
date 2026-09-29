import ipaddr from 'ipaddr.js'
import { NetError, NetErrorCodes, invalidInput } from './errors'

/** Where an address points, as named by `ipaddr.js` (`unicast` is the public internet). */
export type AddressRange = string

/**
 * Classify an IPv4/IPv6 literal. IPv4-mapped IPv6 (`::ffff:10.0.0.1`) is
 * classified as the IPv4 address it carries. Returns undefined for a
 * string that is not an IP address.
 */
export function classifyAddress(address: string): AddressRange | undefined {
  const literal = address.startsWith('[') && address.endsWith(']') ? address.slice(1, -1) : address
  if (!ipaddr.isValid(literal)) return undefined
  let parsed = ipaddr.parse(literal)
  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address()
  }
  return parsed.range()
}

/**
 * True only for public unicast addresses. Private (RFC 1918), loopback,
 * link-local (incl. cloud metadata 169.254.169.254), CGNAT, unique-local
 * IPv6, multicast, reserved, NAT64/6to4/Teredo and IPv4-mapped private
 * addresses are all non-public.
 */
export function isPublicAddress(address: string): boolean {
  return classifyAddress(address) === 'unicast'
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa']

export type LookupFn = (hostname: string) => Promise<readonly string[]>

export interface AssertPublicUrlOptions {
  /** Allowed URL protocols. Default `http:` and `https:`. */
  protocols?: readonly string[]
  /**
   * Resolve a hostname to its addresses so each one is checked. Without it,
   * only IP literals and obviously local names are rejected. In Node:
   * `async h => (await dns.promises.lookup(h, { all: true })).map(a => a.address)`.
   */
  lookup?: LookupFn
  /** Hostnames trusted even if they resolve to private addresses (exact match). */
  allowHosts?: readonly string[]
}

function blocked(url: URL, reason: string): NetError {
  return new NetError({
    code: NetErrorCodes.AK_NET_BLOCKED_ADDRESS,
    message: `Refusing to request ${url.origin}: ${reason}`,
    hint: 'Only public internet addresses are allowed. Add the host to allowHosts if it is trusted.',
  })
}

/**
 * Guard against SSRF: throw unless `input` is an http(s) URL whose host is
 * (or resolves to) public addresses only. Returns the parsed URL and the
 * addresses checked. Resolve-then-fetch can still race a DNS rebinding;
 * pin the returned address when the transport allows it.
 */
export async function assertPublicUrl(
  input: string | URL,
  options: AssertPublicUrlOptions = {},
): Promise<{ url: URL; addresses: string[] }> {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw invalidInput(`Invalid URL: ${String(input)}`)
  }
  const protocols = options.protocols ?? ['http:', 'https:']
  if (!protocols.includes(url.protocol)) throw blocked(url, `protocol ${url.protocol} is not allowed`)
  // WHATWG URL already normalises IPv4 forms like 0x7f.1 to 127.0.0.1.
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (options.allowHosts?.includes(host)) return { url, addresses: [] }
  const literal = classifyAddress(host)
  if (literal !== undefined) {
    if (literal !== 'unicast') throw blocked(url, `${host} is a ${literal} address`)
    return { url, addresses: [host.replace(/^\[|\]$/g, '')] }
  }
  if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some(suffix => host.endsWith(suffix))) {
    throw blocked(url, `${host} is a local hostname`)
  }
  if (!options.lookup) return { url, addresses: [] }
  const addresses = [...(await options.lookup(host))]
  if (addresses.length === 0) throw blocked(url, `${host} did not resolve`)
  for (const address of addresses) {
    const range = classifyAddress(address)
    if (range !== 'unicast') throw blocked(url, `${host} resolves to ${address} (${range ?? 'invalid'})`)
  }
  return { url, addresses }
}
