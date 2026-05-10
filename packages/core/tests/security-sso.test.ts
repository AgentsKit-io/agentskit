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

function base64url(bytes: Uint8Array | string): string {
  const buf = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!)
  return btoa(bin).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function makeJwt(privateKey: CryptoKey, claims: Record<string, unknown>, kid = 'k1') {
  const header = { alg: 'RS256', typ: 'JWT', kid }
  const headerSeg = base64url(JSON.stringify(header))
  const payloadSeg = base64url(JSON.stringify(claims))
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
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
    signingCertPem: '-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----',
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

  it('extracts a tenant attribute', () => {
    expect(verifier.extractTenant(baseAssertion(), 'tenant')).toBe('acme')
    expect(verifier.extractTenant(baseAssertion(), 'missing')).toBeUndefined()
  })
})
