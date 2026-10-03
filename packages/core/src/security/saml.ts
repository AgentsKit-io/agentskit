import { ConfigError, ErrorCodes } from '../errors'

/** Named attribute and values extracted from a parsed SAML assertion. */
export interface SamlAttribute {
  name: string
  values: string[]
}

/** Parsed SAML subject, issuer, audience, validity, and attributes. */
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

/** Expected issuer and audience after the XML signature is checked externally. */
export interface SamlVerifierOptions {
  /** Expected `Issuer` (IdP entity id). */
  issuer: string
  /** Expected audience (SP entity id). */
  audience: string
  /** XML signature must be validated externally before verifyClaims(). */
  signatureValidation: 'external'
  /** Allowed clock skew in seconds. Default 30. */
  clockSkewSeconds?: number
}

/** Claim checks and tenant extraction for parsed SAML assertions. */
export interface SamlVerifier {
  /** Verify a parsed SAML assertion after external signature validation. */
  verifyClaims: (assertion: SamlAssertion) => void
  /** Reusable claim extraction. */
  extractTenant: (assertion: SamlAssertion, attributeName: string) => string | undefined
}

/** Create claim checks for assertions whose XML signature was validated externally.
 * @param options Expected issuer, audience, and signature-validation declaration.
 * @returns Claim verification and tenant extraction methods.
 * @throws {ConfigError} If external signature validation is not declared.
 */
export function createSamlVerifier(options: SamlVerifierOptions): SamlVerifier {
  if (options.signatureValidation !== 'external') {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'SAML signatureValidation must be "external"; verify the XML signature before verifyClaims()',
    })
  }
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
        const notBefore = Date.parse(assertion.notBefore)
        if (!Number.isNaN(notBefore) && notBefore > now + skew) {
          throw new ConfigError({
            code: ErrorCodes.AK_CONFIG_INVALID,
            message: `SAML assertion not yet valid: ${assertion.notBefore}`,
          })
        }
      }
    },
    extractTenant(assertion, attributeName) {
      return assertion.attributes.find(attribute => attribute.name === attributeName)?.values[0]
    },
  }
}
