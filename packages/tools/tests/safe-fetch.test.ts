import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  safeFetch,
  checkEgress,
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateHost,
} from '../src/safe-fetch'

afterEach(() => vi.unstubAllGlobals())

describe('isPrivateIPv4', () => {
  it('flags RFC1918 / loopback / link-local / CGNAT', () => {
    for (const ip of ['10.0.0.1', '172.16.0.1', '192.168.1.1', '127.0.0.1', '169.254.169.254', '100.64.0.1', '0.0.0.0']) {
      expect(isPrivateIPv4(ip)).toBe(true)
    }
  })
  it('allows public addresses', () => {
    expect(isPrivateIPv4('93.184.216.34')).toBe(false)
    expect(isPrivateIPv4('8.8.8.8')).toBe(false)
  })
})

describe('isPrivateIPv6', () => {
  it('flags loopback / unique-local / link-local / mapped', () => {
    for (const ip of ['::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect(isPrivateIPv6(ip)).toBe(true)
    }
    expect(isPrivateIPv6('2606:4700::1111')).toBe(false)
  })

  it('flags canonical IPv4-mapped hexadecimal loopback ::ffff:7f00:1 (ADR-0010)', () => {
    // 7f00:1 is the hex form of 127.0.0.1; dotted ::ffff:127.0.0.1 alone is insufficient.
    expect(isPrivateIPv6('::ffff:7f00:1')).toBe(true)
    expect(isPrivateIPv6('0:0:0:0:0:ffff:7f00:1')).toBe(true)
    expect(isPrivateIPv6('::ffff:5db8:d822')).toBe(false)
  })
})

describe('isPrivateHost', () => {
  it('blocks localhost and cloud metadata names without DNS', async () => {
    expect(await isPrivateHost('localhost')).toBe(true)
    expect(await isPrivateHost('metadata.google.internal')).toBe(true)
  })
  it('blocks literal private IPs', async () => {
    expect(await isPrivateHost('169.254.169.254')).toBe(true)
  })
})

describe('checkEgress', () => {
  it('blocks non-http(s) protocols', async () => {
    expect(await checkEgress(new URL('file:///etc/passwd'))).toMatch(/unsupported protocol/)
  })
  it('blocks private hosts by default', async () => {
    expect(await checkEgress(new URL('http://169.254.169.254/'))).toMatch(/SSRF blocked|private\/loopback/)
  })
  it('blocks IPv4-mapped hexadecimal loopback URL (ADR-0010)', async () => {
    expect(await checkEgress(new URL('http://[::ffff:7f00:1]/'))).toMatch(/SSRF blocked|private\/loopback/)
  })
  it('allows public hosts', async () => {
    expect(await checkEgress(new URL('https://93.184.216.34/'))).toBeNull()
  })
  it('enforces an allowlist', async () => {
    expect(await checkEgress(new URL('https://evil.test/'), { allowedHosts: ['good.test'] })).toMatch(/not in allowedHosts/)
    expect(await checkEgress(new URL('https://good.test/'), { allowedHosts: ['good.test'] })).toBeNull()
  })
  it('honours allowPrivateHosts', async () => {
    expect(await checkEgress(new URL('http://127.0.0.1/'), { allowPrivateHosts: true })).toBeNull()
  })
})

describe('safeFetch', () => {
  it('throws AK_TOOL_INVALID_INPUT on a blocked host before fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toMatchObject({
      code: 'AK_TOOL_INVALID_INPUT',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns the response for an allowed host', async () => {
    const res = new Response('ok', { status: 200 })
    vi.stubGlobal('fetch', vi.fn(async () => res))
    const out = await safeFetch('https://93.184.216.34/')
    expect(out.status).toBe(200)
  })

  it('re-gates redirect hops and blocks an SSRF redirect', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } })
    vi.stubGlobal('fetch', vi.fn(async () => redirect))
    await expect(safeFetch('https://93.184.216.34/')).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
  })

  it('cancels the discarded redirect response body before following the next hop', async () => {
    const cancel = vi.fn(async () => {})
    const redirect = {
      status: 302,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'location' ? 'https://93.184.216.34/next' : null),
      },
      body: { cancel },
    }
    const final = new Response('ok', { status: 200 })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect)
      .mockResolvedValueOnce(final)
    vi.stubGlobal('fetch', fetchMock)

    const out = await safeFetch('https://93.184.216.34/')
    expect(out.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(cancel).toHaveBeenCalled()
    // Drain must happen before the next hop is issued (connection reuse / leak hygiene).
    expect(cancel.mock.invocationCallOrder[0]!).toBeLessThan(fetchMock.mock.invocationCallOrder[1]!)
  })

  it('rejects an invalid URL', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(safeFetch('not a url')).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
  })
})
