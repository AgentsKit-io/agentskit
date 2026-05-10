import { ConfigError, ErrorCodes } from '../errors'

/**
 * SSO helpers for production AgentsKit deployments. Audit log and
 * multi-tenant cost-guard already shipped; this fills in the
 * authentication half — verifying OIDC ID tokens issued by your IdP
 * (Okta, Auth0, Azure AD, Keycloak, Cognito) so a runtime can map an
 * inbound request to a tenant.
 *
 * Pure, dependency-free: signature verification uses WebCrypto
 * (`crypto.subtle`), available in Node 18+ and every modern browser /
 * edge runtime. SAML is included as a parser stub — full SAML
 * verification needs an XML/XML-DSig library, so the contract here is
 * "bring your own validator" with a typed shape.
 *
 * Closes part of issue #203 (SSO half).
 */

// ---------------------------------------------------------------------------
// OIDC ID-token verifier (RS256 / ES256)
// ---------------------------------------------------------------------------

export interface OidcVerifierOptions {
  /** Expected `iss` claim. Required. */
  issuer: string
  /** Expected `aud` claim — string or one of multiple acceptable audiences. */
  audience: string | string[]
  /**
   * JWKS URL. If omitted, derived from issuer as
   * `${issuer}/.well-known/jwks.json`. Override when your IdP uses a
   * non-standard path.
   */
  jwksUrl?: string
  /**
   * Cache TTL for JWKS keys, ms. Default 1h. JWKS rotation is rare;
   * the cache also bounds outbound traffic from a busy runtime.
   */
  jwksTtlMs?: number
  /**
   * Allowed clock skew in seconds when checking `exp` / `nbf`.
   * Default 30s — tolerates routine NTP drift across regions.
   */
  clockSkewSeconds?: number
  /** Custom fetch (testing / runtime injection). */
  fetch?: typeof fetch
}

export interface OidcClaims {
  iss: string
  sub: string
  aud: string | string[]
  exp: number
  iat: number
  nbf?: number
  /** IdP-specific tenant claim. Common keys: `tid`, `org_id`, `tenant`. */
  [claim: string]: unknown
}

export interface OidcVerifier {
  /** Verify a JWT. Throws on invalid signature, claims, or expiry. */
  verify: (token: string) => Promise<OidcClaims>
  /** Force a JWKS refresh (useful after a known IdP key rotation). */
  refreshJwks: () => Promise<void>
}

interface JwksKey {
  kid: string
  kty: 'RSA' | 'EC'
  alg?: string
  use?: string
  n?: string
  e?: string
  crv?: string
  x?: string
  y?: string
}

interface JwksResponse {
  keys: JwksKey[]
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(input.length + ((4 - (input.length % 4)) % 4), '=')
  if (typeof atob === 'function') {
    const bin = atob(padded)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }
  return new Uint8Array(Buffer.from(padded, 'base64'))
}

function decodeJwtJson<T>(segment: string): T {
  const bytes = base64UrlDecode(segment)
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}

async function importJwksKey(key: JwksKey): Promise<CryptoKey> {
  const algForKty: Record<string, RsaHashedImportParams | EcKeyImportParams> = {
    RSA: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    EC: { name: 'ECDSA', namedCurve: key.crv ?? 'P-256' },
  }
  const algorithm = algForKty[key.kty]
  if (!algorithm) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `unsupported JWKS key type: ${key.kty}`,
      hint: 'AgentsKit OIDC verifier supports RSA (RS256) and EC (ES256) keys.',
    })
  }
  return crypto.subtle.importKey('jwk', key as JsonWebKey, algorithm, false, ['verify'])
}

function toAb(view: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(view.byteLength)
  new Uint8Array(out).set(view)
  return out
}

async function verifySignature(
  alg: string,
  cryptoKey: CryptoKey,
  data: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  const sig = toAb(signature)
  const payload = toAb(data)
  if (alg === 'RS256') {
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, payload)
  }
  if (alg === 'ES256') {
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, sig, payload)
  }
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message: `unsupported JWT alg: ${alg}`,
    hint: 'AgentsKit OIDC verifier supports RS256 and ES256.',
  })
}

export function createOidcVerifier(options: OidcVerifierOptions): OidcVerifier {
  const jwksUrl = options.jwksUrl ?? `${options.issuer.replace(/\/$/, '')}/.well-known/jwks.json`
  const jwksTtlMs = options.jwksTtlMs ?? 60 * 60 * 1000
  const clockSkew = options.clockSkewSeconds ?? 30
  const fetchImpl = options.fetch ?? fetch

  let jwksCache: { fetchedAt: number; keys: JwksKey[] } | undefined

  async function loadJwks(): Promise<JwksKey[]> {
    if (jwksCache && Date.now() - jwksCache.fetchedAt < jwksTtlMs) return jwksCache.keys
    const res = await fetchImpl(jwksUrl)
    if (!res.ok) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `JWKS fetch failed: ${res.status} ${res.statusText}`,
        hint: 'Verify the issuer URL and that the IdP exposes a JWKS endpoint.',
      })
    }
    const body = (await res.json()) as JwksResponse
    jwksCache = { fetchedAt: Date.now(), keys: body.keys }
    return body.keys
  }

  return {
    async verify(token) {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'malformed JWT (expected 3 segments)',
        })
      }
      const [headerSeg, payloadSeg, signatureSeg] = parts as [string, string, string]
      const header = decodeJwtJson<{ alg: string; kid?: string; typ?: string }>(headerSeg)
      const claims = decodeJwtJson<OidcClaims>(payloadSeg)

      let keys = await loadJwks()
      let key = header.kid ? keys.find(k => k.kid === header.kid) : keys[0]
      if (!key) {
        // Maybe the cache is stale because the IdP rotated keys.
        jwksCache = undefined
        keys = await loadJwks()
        key = header.kid ? keys.find(k => k.kid === header.kid) : keys[0]
      }
      if (!key) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `no JWKS key found for kid=${header.kid ?? '<none>'}`,
          hint: 'Ensure the JWKS endpoint exposes the signing key.',
        })
      }

      const cryptoKey = await importJwksKey(key)
      const signedInput = new TextEncoder().encode(`${headerSeg}.${payloadSeg}`)
      const signature = base64UrlDecode(signatureSeg)
      const ok = await verifySignature(header.alg, cryptoKey, signedInput, signature)
      if (!ok) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'JWT signature verification failed',
        })
      }

      const now = Math.floor(Date.now() / 1000)
      if (claims.iss !== options.issuer) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `iss mismatch: expected ${options.issuer}, got ${claims.iss}`,
        })
      }
      const expectedAuds = Array.isArray(options.audience) ? options.audience : [options.audience]
      const tokenAuds = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
      if (!tokenAuds.some(a => expectedAuds.includes(a))) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `aud mismatch: expected one of ${expectedAuds.join(',')}, got ${tokenAuds.join(',')}`,
        })
      }
      if (claims.exp + clockSkew < now) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `JWT expired at ${new Date(claims.exp * 1000).toISOString()}`,
        })
      }
      if (claims.nbf && claims.nbf > now + clockSkew) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `JWT not yet valid (nbf=${claims.nbf})`,
        })
      }

      return claims
    },

    async refreshJwks() {
      jwksCache = undefined
      await loadJwks()
    },
  }
}

// ---------------------------------------------------------------------------
// SAML assertion shape (BYO validator)
// ---------------------------------------------------------------------------

export interface SamlAttribute {
  name: string
  values: string[]
}

export interface SamlAssertion {
  /** SAML NameID — usually the user's stable identifier. */
  subject: string
  /** IdP entity id (`Issuer` element). */
  issuer: string
  /** Audience restriction — your SP entity id. */
  audience: string
  /** ISO timestamps. */
  notBefore?: string
  notOnOrAfter: string
  attributes: SamlAttribute[]
}

export interface SamlVerifierOptions {
  /** Expected `Issuer` (IdP entity id). */
  issuer: string
  /** Expected audience (SP entity id). */
  audience: string
  /**
   * X.509 cert (PEM) that signs the IdP's assertions. Required —
   * AgentsKit does not parse SAML metadata XML.
   */
  signingCertPem: string
  /** Allowed clock skew in seconds. Default 30. */
  clockSkewSeconds?: number
}

export interface SamlVerifier {
  /**
   * Verify a parsed SAML assertion. Signature verification is
   * delegated to your SAML library (`samlify`, `node-saml`, etc.) —
   * pass the parsed shape here for the AgentsKit-side claim checks.
   */
  verifyClaims: (assertion: SamlAssertion) => void
  /** Reusable claim extraction. */
  extractTenant: (assertion: SamlAssertion, attributeName: string) => string | undefined
}

export function createSamlVerifier(options: SamlVerifierOptions): SamlVerifier {
  const skew = (options.clockSkewSeconds ?? 30) * 1000
  return {
    verifyClaims(assertion) {
      if (assertion.issuer !== options.issuer) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `SAML issuer mismatch: expected ${options.issuer}, got ${assertion.issuer}`,
        })
      }
      if (assertion.audience !== options.audience) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `SAML audience mismatch: expected ${options.audience}, got ${assertion.audience}`,
        })
      }
      const now = Date.now()
      const notOnOrAfter = Date.parse(assertion.notOnOrAfter)
      if (Number.isNaN(notOnOrAfter)) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `invalid SAML NotOnOrAfter: ${assertion.notOnOrAfter}`,
        })
      }
      if (notOnOrAfter + skew < now) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `SAML assertion expired at ${assertion.notOnOrAfter}`,
        })
      }
      if (assertion.notBefore) {
        const nb = Date.parse(assertion.notBefore)
        if (!Number.isNaN(nb) && nb > now + skew) {
          throw new ConfigError({
            code: ErrorCodes.AK_CONFIG_INVALID,
            message: `SAML assertion not yet valid: ${assertion.notBefore}`,
          })
        }
      }
    },
    extractTenant(assertion, attributeName) {
      const attr = assertion.attributes.find(a => a.name === attributeName)
      return attr?.values[0]
    },
  }
}
