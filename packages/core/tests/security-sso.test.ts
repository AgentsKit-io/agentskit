import { describe, expect, it, vi } from 'vitest'
import { createOidcVerifier, createSamlVerifier, type SamlAssertion } from '../src/security/sso'

// ---------------------------------------------------------------------------
// OIDC verifier
// ---------------------------------------------------------------------------

async function generateRsaSigningKey() {
  const keys = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey)
  return { keys, jwk }
}

async function generateEcSigningKey() {
  const keys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )
  const jwk = await crypto.subtle.exportKey('jwk', keys.publicKey)
  return { keys, jwk }
}

function base64url(bytes: Uint8Array | string): string {
  const buf = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!)
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function makeJwt(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
  kid = 'k1',
  alg = 'RS256',
  signatureAlg = alg,
) {
  const header = { alg, typ: 'JWT', kid }
  const headerSeg = base64url(JSON.stringify(header))
  const payloadSeg = base64url(JSON.stringify(claims))
  const algorithm = signatureAlg === 'ES256'
    ? { name: 'ECDSA', hash: 'SHA-256' } as const
    : 'RSASSA-PKCS1-v1_5' as const
  const sig = await crypto.subtle.sign(
    algorithm,
    privateKey,
    new TextEncoder().encode(`${headerSeg}.${payloadSeg}`),
  )
  return `${headerSeg}.${payloadSeg}.${base64url(new Uint8Array(sig))}`
}

describe('createOidcVerifier', () => {
  it('verifies a well-formed token', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const fakeFetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }),
      }) as unknown as Response,
    )
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      jwksUrl: 'https://idp.test/.well-known/jwks.json',
      fetch: fakeFetch as unknown as typeof fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test',
      aud: 'agentskit',
      sub: 'user-1',
      exp: now + 60,
      iat: now,
      tid: 'tenant-42',
    })
    const claims = await verifier.verify(token)
    expect(claims.sub).toBe('user-1')
    expect(claims.tid).toBe('tenant-42')
  })

  it('rejects an expired token', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      jwksUrl: 'https://idp.test/.well-known/jwks.json',
      fetch: (async () =>
        ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }) }) as unknown as Response) as unknown as typeof fetch,
    })
    const past = Math.floor(Date.now() / 1000) - 600
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test',
      aud: 'agentskit',
      sub: 'user-1',
      exp: past,
      iat: past - 60,
    })
    await expect(verifier.verify(token)).rejects.toThrow(/expired/)
  })

  it('rejects a token without a finite exp claim', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      jwksUrl: 'https://idp.test/.well-known/jwks.json',
      fetch: (async () =>
        ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }) }) as unknown as Response) as unknown as typeof fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test', aud: 'agentskit', sub: 'user-1', iat: now,
    })
    await expect(verifier.verify(token)).rejects.toThrow(/exp claim is required/)
  })

  it('rejects audience mismatch', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      jwksUrl: 'https://idp.test/.well-known/jwks.json',
      fetch: (async () =>
        ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }) }) as unknown as Response) as unknown as typeof fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test',
      aud: 'someone-else',
      sub: 'user-1',
      exp: now + 60,
      iat: now,
    })
    await expect(verifier.verify(token)).rejects.toThrow(/aud mismatch/)
  })

  it('rejects RSA signing keys smaller than 2048 bits', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const weakModulus = base64url(new Uint8Array(128).fill(0xff))
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      fetch: (async () =>
        ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1', n: weakModulus }] }) }) as unknown as Response) as unknown as typeof fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test',
      aud: 'agentskit',
      sub: 'user-1',
      exp: now + 60,
      iat: now,
    })

    await expect(verifier.verify(token)).rejects.toThrow(/at least 2048 bits/)
  })

  it('rejects a JWK whose key type does not match the token algorithm', async () => {
    const { keys } = await generateRsaSigningKey()
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      fetch: (async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ keys: [{ kid: 'k1', kty: 'EC', crv: 'P-256', x: 'AA', y: 'AA' }] }),
        }) as unknown as Response) as unknown as typeof fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test',
      aud: 'agentskit',
      sub: 'user-1',
      exp: now + 60,
      iat: now,
    })

    await expect(verifier.verify(token)).rejects.toThrow(/RS256 requires an RSA JWK/)
  })

  it('rejects an EC curve that is incompatible with ES256', async () => {
    const { keys } = await generateRsaSigningKey()
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test',
      audience: 'agentskit',
      fetch: (async () =>
        ({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: async () => ({ keys: [{ kid: 'k1', kty: 'EC', crv: 'P-384', x: 'AA', y: 'AA' }] }),
        }) as unknown as Response) as unknown as typeof fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test',
      aud: 'agentskit',
      sub: 'user-1',
      exp: now + 60,
      iat: now,
    }, 'k1', 'ES256', 'RS256')

    await expect(verifier.verify(token)).rejects.toThrow(/ES256 requires a P-256 JWK/)
  })

  it('verifies an ES256 token', async () => {
    const { keys, jwk } = await generateEcSigningKey()
    const fetch = vi.fn(async () =>
      ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'ec-1' }] }) }) as unknown as Response,
    )
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test', audience: ['other', 'agentskit'], fetch: fetch as unknown as typeof globalThis.fetch,
    })
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, {
      iss: 'https://idp.test', aud: ['agentskit'], sub: 'ec-user', exp: now + 60, iat: now,
    }, 'ec-1', 'ES256')
    await expect(verifier.verify(token)).resolves.toMatchObject({ sub: 'ec-user' })
  })

  it('rejects malformed signatures and unsupported algorithms', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const fetch = async () =>
      ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }) }) as unknown as Response
    const verifier = createOidcVerifier({ issuer: 'https://idp.test', audience: 'agentskit', fetch: fetch as unknown as typeof globalThis.fetch })
    const now = Math.floor(Date.now() / 1000)
    const valid = await makeJwt(keys.privateKey, { iss: 'https://idp.test', aud: 'agentskit', sub: 'u', exp: now + 60, iat: now })
    const [header, payload] = valid.split('.')
    await expect(verifier.verify(`${header}.${payload}.${base64url('bad')}`)).rejects.toThrow(/signature verification failed/)

    const { alg: _ignoredAlg, ...jwkWithoutAlg } = jwk
    const unsupported = createOidcVerifier({
      issuer: 'https://idp.test', audience: 'agentskit',
      fetch: (async () => ({
        ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwkWithoutAlg, kid: 'k1' }] }),
      })) as unknown as typeof fetch,
    })
    const unsupportedHeader = base64url(JSON.stringify({ alg: 'HS256', kid: 'k1' }))
    await expect(unsupported.verify(`${unsupportedHeader}.${payload}.${base64url('bad')}`)).rejects.toThrow(/unsupported JWT alg/)
  })

  it('rejects incompatible signing-key metadata', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, { iss: 'https://idp.test', aud: 'agentskit', sub: 'u', exp: now + 60, iat: now })
    for (const key of [
      { ...jwk, kid: 'k1', use: 'enc' },
      { ...jwk, kid: 'k1', alg: 'RS384' },
    ]) {
      const verifier = createOidcVerifier({
        issuer: 'https://idp.test', audience: 'agentskit',
        fetch: (async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [key] }) })) as unknown as typeof fetch,
      })
      await expect(verifier.verify(token)).rejects.toThrow(/signing key|declares alg/)
    }
  })

  it('refreshes stale or missing keys and rejects an empty JWKS', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, { iss: 'https://idp.test', aud: 'agentskit', sub: 'u', exp: now + 60, iat: now }, 'rotated')
    let calls = 0
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test', audience: 'agentskit',
      fetch: (async () => {
        calls++
        return ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: calls === 1 ? [] : [{ ...jwk, kid: 'rotated' }] }) }) as unknown as Response
      }) as unknown as typeof fetch,
    })
    await expect(verifier.verify(token)).resolves.toMatchObject({ sub: 'u' })
    expect(calls).toBe(2)
  })

  it('validates issuer, nbf, fetch failures, and explicit refresh', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const now = Math.floor(Date.now() / 1000)
    const fetch = vi.fn(async () =>
      ({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }) }) as unknown as Response,
    )
    const verifier = createOidcVerifier({ issuer: 'https://idp.test', audience: 'agentskit', fetch: fetch as unknown as typeof globalThis.fetch })
    const token = await makeJwt(keys.privateKey, { iss: 'https://wrong.test', aud: 'agentskit', sub: 'u', exp: now + 60, nbf: now + 600, iat: now })
    await expect(verifier.verify(token)).rejects.toThrow(/iss mismatch/)
    const future = await makeJwt(keys.privateKey, { iss: 'https://idp.test', aud: 'agentskit', sub: 'u', exp: now + 60, nbf: now + 600, iat: now })
    await expect(verifier.verify(future)).rejects.toThrow(/not yet valid/)
    await verifier.refreshJwks()
    expect(fetch).toHaveBeenCalledTimes(2)

    const failed = createOidcVerifier({
      issuer: 'https://idp.test', audience: 'agentskit',
      fetch: (async () => ({ ok: false, status: 503, statusText: 'Unavailable' })) as unknown as typeof fetch,
    })
    await expect(failed.verify(token)).rejects.toThrow(/JWKS fetch failed/)
  })

  it('rejects malformed and oversized JWKS responses', async () => {
    const { keys, jwk } = await generateRsaSigningKey()
    const now = Math.floor(Date.now() / 1000)
    const token = await makeJwt(keys.privateKey, { iss: 'https://idp.test', aud: 'agentskit', sub: 'u', exp: now + 60, iat: now })
    const bodies: unknown[] = [
      {},
      { keys: [{ kid: 'k1', kty: 'OK' }] },
      { keys: Array.from({ length: 101 }, () => ({ ...jwk, kid: 'k1' })) },
    ]
    for (const body of bodies) {
      const verifier = createOidcVerifier({
        issuer: 'https://idp.test', audience: 'agentskit',
        fetch: (async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => body })) as unknown as typeof fetch,
      })
      await expect(verifier.verify(token)).rejects.toThrow(/JWKS|kty/)
    }
  })

  it('coalesces concurrent JWKS loads and aborts a stalled request', async () => {
    const { jwk } = await generateRsaSigningKey()
    let release: ((value: Response) => void) | undefined
    const response = new Promise<Response>(resolve => { release = resolve })
    const fetch = vi.fn(() => response)
    const verifier = createOidcVerifier({
      issuer: 'https://idp.test', audience: 'agentskit', fetch: fetch as unknown as typeof globalThis.fetch,
    })
    const first = verifier.refreshJwks()
    const second = verifier.refreshJwks()
    release!({ ok: true, status: 200, statusText: 'OK', json: async () => ({ keys: [{ ...jwk, kid: 'k1' }] }) } as unknown as Response)
    await Promise.all([first, second])
    expect(fetch).toHaveBeenCalledOnce()

    const stalled = createOidcVerifier({
      issuer: 'https://idp.test', audience: 'agentskit', jwksTimeoutMs: 1,
      fetch: (async (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
      })) as unknown as typeof fetch,
    })
    await expect(stalled.refreshJwks()).rejects.toThrow(/timed out/)
  })
})

// ---------------------------------------------------------------------------
// SAML verifier (claim checks)
// ---------------------------------------------------------------------------

describe('createSamlVerifier', () => {
  const baseAssertion = (): SamlAssertion => ({
    subject: 'alice@acme.com',
    issuer: 'https://idp.acme.com',
    audience: 'urn:agentskit:sp',
    notOnOrAfter: new Date(Date.now() + 60_000).toISOString(),
    attributes: [{ name: 'tenant', values: ['acme'] }],
  })

  const verifier = createSamlVerifier({
    issuer: 'https://idp.acme.com',
    audience: 'urn:agentskit:sp',
    signatureValidation: 'external',
  })

  it('passes a valid assertion', () => {
    expect(() => verifier.verifyClaims(baseAssertion())).not.toThrow()
  })

  it('rejects expired NotOnOrAfter', () => {
    const a = baseAssertion()
    a.notOnOrAfter = new Date(Date.now() - 600_000).toISOString()
    expect(() => verifier.verifyClaims(a)).toThrow(/expired/)
  })

  it('rejects wrong audience', () => {
    const a = baseAssertion()
    a.audience = 'urn:other'
    expect(() => verifier.verifyClaims(a)).toThrow(/audience mismatch/)
  })

  it('rejects wrong issuer, invalid timestamps, and future assertions', () => {
    const wrongIssuer = baseAssertion()
    wrongIssuer.issuer = 'https://other.test'
    expect(() => verifier.verifyClaims(wrongIssuer)).toThrow(/issuer mismatch/)

    const invalidExpiry = baseAssertion()
    invalidExpiry.notOnOrAfter = 'not-a-date'
    expect(() => verifier.verifyClaims(invalidExpiry)).toThrow(/invalid SAML NotOnOrAfter/)

    const invalidNotBefore = baseAssertion()
    invalidNotBefore.notBefore = 'not-a-date'
    expect(() => verifier.verifyClaims(invalidNotBefore)).not.toThrow()

    const future = baseAssertion()
    future.notBefore = new Date(Date.now() + 600_000).toISOString()
    expect(() => verifier.verifyClaims(future)).toThrow(/not yet valid/)
  })

  it('extracts a tenant attribute', () => {
    expect(verifier.extractTenant(baseAssertion(), 'tenant')).toBe('acme')
    expect(verifier.extractTenant(baseAssertion(), 'missing')).toBeUndefined()
  })
})
