import { describe, it, expect, vi, afterEach } from 'vitest'
import { createServer } from 'node:http'
import { lookup } from 'node:dns/promises'
import { classifyAddress, readText } from '@agentskit/net'
import {
  safeFetch,
  checkEgress,
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateHost,
} from '../src/safe-fetch'

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }))

const mockLookup = vi.mocked(lookup)

afterEach(() => {
  vi.unstubAllGlobals()
  mockLookup.mockReset()
})

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
  it('returns false for invalid or non-IPv4 input', () => {
    expect(isPrivateIPv4('not an ip')).toBe(false)
    expect(isPrivateIPv4('256.1.1.1')).toBe(false)
    expect(isPrivateIPv4('::1')).toBe(false)
  })
  it('keeps decimal dotted-quad behavior for leading-zero octets', () => {
    expect(classifyAddress('10.0.0.1')).toBe('private')
    expect(isPrivateIPv4('010.0.0.1')).toBe(true)
    expect(isPrivateIPv4('093.184.216.34')).toBe(false)
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
  it('returns false for invalid, bracketed, or non-IPv6 input', () => {
    expect(isPrivateIPv6('not an ip')).toBe(false)
    expect(isPrivateIPv6('[::1]')).toBe(false)
    expect(isPrivateIPv6('127.0.0.1')).toBe(false)
  })
})

describe('delegated address classifications', () => {
  it('records current net range names for the expanded blocked categories', () => {
    expect({
      cgnat: classifyAddress('100.64.0.1'),
      mappedLoopback: classifyAddress('::ffff:127.0.0.1'),
      uniqueLocal: classifyAddress('fd00::1'),
      metadata: classifyAddress('169.254.169.254'),
    }).toEqual({
      cgnat: 'carrierGradeNat',
      mappedLoopback: 'loopback',
      uniqueLocal: 'uniqueLocal',
      metadata: 'linkLocal',
    })
    expect(isPrivateIPv4('100.64.0.1')).toBe(true)
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIPv6('fd00::1')).toBe(true)
  })
})

describe('isPrivateHost', () => {
  it('blocks localhost and cloud metadata names without DNS', async () => {
    expect(await isPrivateHost('localhost')).toBe(true)
    expect(await isPrivateHost('localhost.')).toBe(true)
    expect(await isPrivateHost('metadata.google.internal')).toBe(true)
    expect(await isPrivateHost('010.0.0.1')).toBe(true)
    expect(mockLookup).not.toHaveBeenCalled()
  })
  it('blocks literal private IPs', async () => {
    expect(await isPrivateHost('169.254.169.254')).toBe(true)
  })
  it('fails closed on DNS errors and mixed public/private answers', async () => {
    mockLookup.mockRejectedValueOnce(new Error('DNS unavailable'))
    expect(await isPrivateHost('missing.example')).toBe(true)

    mockLookup.mockResolvedValueOnce([
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ])
    expect(await isPrivateHost('mixed.example')).toBe(true)
    expect(mockLookup).toHaveBeenLastCalledWith('mixed.example', { all: true, verbatim: true })
  })
  it.each([
    'example.com/path',
    'example.com/',
    'example.com#',
    'example.com?',
    'example.com\\',
    'exam\nple.com',
    '@example.com',
    '127.0.0.1@8.8.8.8',
    'example.com:80',
    'example.com?query=1',
  ])('fails closed for non-host input %s without resolving it', async host => {
    expect(await isPrivateHost(host)).toBe(true)
    expect(mockLookup).not.toHaveBeenCalled()
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
  it.each([
    'http://100.64.0.1/',
    'http://[::ffff:127.0.0.1]/',
    'http://[fd00::1]/',
    'http://169.254.169.254/',
    'http://localhost./',
  ])('blocks expanded non-public target %s before fetch', async input => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(safeFetch(input)).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
  it('allows public hosts', async () => {
    expect(await checkEgress(new URL('https://93.184.216.34/'))).toBeNull()
  })
  it('enforces an allowlist', async () => {
    expect(await checkEgress(new URL('https://evil.test/'), { allowedHosts: ['good.test'] })).toMatch(/not in allowedHosts/)
    expect(await checkEgress(new URL('https://good.test/'), { allowedHosts: ['good.test'] })).toBeNull()
  })
  it('treats an explicitly empty allowlist as deny-all', async () => {
    expect(await checkEgress(new URL('https://good.test/'), { allowedHosts: [] })).toMatch(/not in allowedHosts/)
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

  it('uses WHATWG URL canonicalization before classifying numeric authorities', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => new Response(new URL(input).href))
    vi.stubGlobal('fetch', fetchMock)

    await expect(safeFetch('http://0177.0.0.1/')).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
    expect(fetchMock).not.toHaveBeenCalled()

    const response = await safeFetch('http://010.0.0.1/')
    expect(await readText(response, { maxBytes: 64 })).toBe('http://8.0.0.1/')
    expect(fetchMock).toHaveBeenCalledWith('http://010.0.0.1/', expect.objectContaining({ redirect: 'manual' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects invalid redirect limits before fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(safeFetch('https://93.184.216.34/', {}, { maxRedirects: -1 })).rejects.toMatchObject({
      code: 'AK_CONFIG_INVALID',
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not forward sensitive headers across origins', async () => {
    const redirect = new Response(null, {
      status: 302,
      headers: { location: 'https://93.184.216.35/next' },
    })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirect)
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await safeFetch('https://93.184.216.34/', {
      headers: {
        Authorization: 'Bearer secret',
        Cookie: 'session=secret',
        'X-Trace': 'keep',
      },
      credentials: 'include',
    })
    const second = fetchMock.mock.calls[1]![1] as RequestInit
    expect(new Headers(second.headers).has('authorization')).toBe(false)
    expect(new Headers(second.headers).has('cookie')).toBe(false)
    expect(new Headers(second.headers).get('x-trace')).toBe('keep')
    expect(second.credentials).toBe('omit')
  })

  it('uses live local HTTP with default deny, an explicit allowlist, and redirect re-gating', async () => {
    let port = 0
    let rootHits = 0
    let redirectHits = 0
    let targetHits = 0
    const server = createServer((request, response) => {
      if (request.url === '/redirect') {
        redirectHits++
        response.writeHead(302, { location: `http://localhost:${port}/target` }).end()
      } else if (request.url === '/target') {
        targetHits++
        response.end('unexpected')
      } else {
        rootHits++
        response.end('local ok')
      }
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('expected an IPv4 listen address')
    port = address.port
    const url = `http://127.0.0.1:${port}`

    try {
      await expect(safeFetch(`http://localhost:${port}/`)).rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
      expect(rootHits).toBe(0)

      const response = await safeFetch(url, {}, { allowedHosts: ['127.0.0.1'] })
      expect(await readText(response, { maxBytes: 64 })).toBe('local ok')
      expect(rootHits).toBe(1)

      await expect(safeFetch(`${url}/redirect`, {}, { allowedHosts: ['127.0.0.1'] }))
        .rejects.toMatchObject({ code: 'AK_TOOL_INVALID_INPUT' })
      expect(redirectHits).toBe(1)
      expect(targetHits).toBe(0)
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
