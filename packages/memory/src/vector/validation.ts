import { ConfigError, ErrorCodes } from '@agentskit/core'

const identifier = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/

export function validateIdentifier(value: string, name: string): string {
  if (!identifier.test(value)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${name} must be a simple identifier (letters, numbers, underscore).`,
      hint: 'Use a configured resource name instead of interpolating arbitrary input into a query or path.',
    })
  }
  return value
}
