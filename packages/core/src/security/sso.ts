import { ConfigError, ErrorCodes } from '../errors'
export { createSamlVerifier } from './saml'
export type { SamlAssertion, SamlAttribute, SamlVerifier, SamlVerifierOptions } from './saml'

export { createSamlVerifier } from './saml'
export type { SamlVerifier, SamlVerifierOptions, SamlAssertion, SamlAttribute } from './saml'
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
  /** Abort a JWKS request after this many milliseconds. Default: 10s. */
  jwksTimeoutMs?: number
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

const MAX_JWKS_KEYS = 100
const MAX_JWKS_BYTES = 1_048_576
const DEFAULT_JWKS_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateJwksResponse(body: unknown): JwksResponse {
  if (!isRecord(body) || !Array.isArray(body.keys)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'JWKS response must contain a keys array',
    })
  }
  let serialized: string
  try {
    serialized = JSON.stringify(body)
  } catch (cause) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'JWKS response is not serializable',
      cause,
    })
  }
  if (serialized.length > MAX_JWKS_BYTES) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `JWKS response exceeds the ${MAX_JWKS_BYTES}-byte limit`,
    })
  }
  if (body.keys.length > MAX_JWKS_KEYS) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `JWKS response exceeds the ${MAX_JWKS_KEYS}-key limit`,
    })
  }
  const keys = body.keys.map((key, index) => {
    if (!isRecord(key) || typeof key.kid !== 'string' || key.kid.length === 0 || key.kid.length > 256) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `JWKS key at index ${index} must have a bounded kid`,
      })
    }
    if (key.kty !== 'RSA' && key.kty !== 'EC') {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `JWKS key ${key.kid} has unsupported kty=${String(key.kty)}`,
      })
    }
    return key as unknown as JwksKey
  })
  return { keys }
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

function rsaModulusBits(modulus: string | undefined): number {
  if (!modulus) return 0
  const bytes = base64UrlDecode(modulus)
  const firstSignificant = bytes.findIndex(byte => byte !== 0)
  if (firstSignificant === -1) return 0
  const firstByteBits = 32 - Math.clz32(bytes[firstSignificant]!)
  return (bytes.length - firstSignificant - 1) * 8 + firstByteBits
}

function assertJwksKeyCompatible(key: JwksKey, alg: string): void {
  if (key.use && key.use !== 'sig') {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `JWKS key ${key.kid} is not a signing key`,
      hint: 'Use a JWK whose use is "sig".',
    })
  }
  if (key.alg && key.alg !== alg) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `JWKS key ${key.kid} declares alg=${key.alg}, expected ${alg}`,
    })
  }
  if (alg === 'RS256') {
    if (key.kty !== 'RSA') {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `RS256 requires an RSA JWK, got ${key.kty}`,
      })
    }
    const modulusBits = rsaModulusBits(key.n)
    if (modulusBits < 2048) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `RSA JWK modulus is ${modulusBits} bits; at least 2048 bits are required`,
        hint: 'Rotate the IdP signing key to RSA 2048 bits or stronger.',
      })
    }
    return
  }
  if (alg === 'ES256') {
    if (key.kty !== 'EC') {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `ES256 requires an EC JWK, got ${key.kty}`,
      })
    }
    if (key.crv !== 'P-256') {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `ES256 requires a P-256 JWK, got ${key.crv ?? '<missing>'}`,
      })
    }
    return
  }
  throw new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message: `unsupported JWT alg: ${alg}`,
    hint: 'AgentsKit OIDC verifier supports RS256 and ES256.',
  })
}

async function importJwksKey(key: JwksKey, alg: string): Promise<CryptoKey> {
  assertJwksKeyCompatible(key, alg)
  const algForKty: Record<string, RsaHashedImportParams | EcKeyImportParams> = {
    RSA: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    EC: { name: 'ECDSA', namedCurve: key.crv! },
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
  const jwksTimeoutMs = options.jwksTimeoutMs ?? DEFAULT_JWKS_TIMEOUT_MS

  let jwksCache: { fetchedAt: number; keys: JwksKey[] } | undefined
  let jwksRequest: Promise<JwksKey[]> | undefined
  let jwksRequestToken = 0

  async function loadJwks(): Promise<JwksKey[]> {
    if (jwksCache && Date.now() - jwksCache.fetchedAt < jwksTtlMs) return jwksCache.keys
    if (jwksRequest) return jwksRequest

    const request = (async () => {
      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), jwksTimeoutMs)
      try {
        const res = await fetchImpl(jwksUrl, { signal: abortController.signal })
        if (!res.ok) {
          throw new ConfigError({
            code: ErrorCodes.AK_CONFIG_INVALID,
            message: `JWKS fetch failed: ${res.status} ${res.statusText}`,
            hint: 'Verify the issuer URL and that the IdP exposes a JWKS endpoint.',
          })
        }
        const body = validateJwksResponse(await res.json())
        jwksCache = { fetchedAt: Date.now(), keys: body.keys }
        return body.keys
      } catch (cause) {
        if (abortController.signal.aborted) {
          throw new ConfigError({
            code: ErrorCodes.AK_CONFIG_INVALID,
            message: `JWKS fetch timed out after ${jwksTimeoutMs}ms`,
            hint: 'Increase jwksTimeoutMs only when the identity provider is known to be slow.',
            cause,
          })
        }
        throw cause
      } finally {
        clearTimeout(timeout)
      }
    })()
    const requestToken = ++jwksRequestToken
    jwksRequest = request
    try {
      return await request
    } finally {
      if (jwksRequestToken === requestToken) jwksRequest = undefined
    }
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

      const cryptoKey = await importJwksKey(key, header.alg)
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
      if (!Number.isFinite(claims.exp)) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: 'JWT exp claim is required and must be a finite number',
          hint: 'The identity provider must issue an ID token with a valid expiration timestamp.',
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
