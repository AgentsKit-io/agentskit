import { ConfigError, ErrorCodes } from '@agentskit/core'

/** All scaffold shapes supported by this package. */
export const SCAFFOLD_TYPES = [
  'tool',
  'skill',
  'adapter',
  'memory-vector',
  'memory-chat',
  'flow',
  'embedder',
  'browser-adapter',
] as const

export type ScaffoldType = (typeof SCAFFOLD_TYPES)[number]

/**
 * Input for {@link scaffold}.
 *
 * `name` must be an unscoped npm-safe kebab-case id (scoped packages are
 * intentionally unsupported until a future beta migration).
 */
export interface ScaffoldConfig {
  type: ScaffoldType
  name: string
  dir: string
  description?: string
  /**
   * When `true`, replace an existing destination after a safe backup.
   * Default `false` — existing destinations fail with `ConfigError`.
   */
  overwrite?: boolean
}

/** Unscoped npm kebab-case: starts with a lowercase letter; alphanumeric segments joined by `-`. */
export const SAFE_PACKAGE_NAME =
  /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

const MAX_DESCRIPTION_LENGTH = 1000

export function invalidConfig(
  message: string,
  hint?: string,
  cause?: unknown,
): ConfigError {
  return new ConfigError({
    code: ErrorCodes.AK_CONFIG_INVALID,
    message,
    hint,
    cause,
  })
}

function hasNul(value: string): boolean {
  return value.includes('\0')
}

/**
 * Runtime-validate a scaffold config before any filesystem work.
 * Throws `ConfigError` with `AK_CONFIG_INVALID` on failure.
 */
export function validateScaffoldConfig(config: ScaffoldConfig): void {
  if (!config || typeof config !== 'object') {
    throw invalidConfig('Scaffold config must be an object')
  }

  if (!(SCAFFOLD_TYPES as readonly string[]).includes(config.type)) {
    throw invalidConfig(
      `Invalid scaffold type "${String(config.type)}"`,
      `Allowed types: ${SCAFFOLD_TYPES.join(', ')}`,
    )
  }

  if (typeof config.name !== 'string' || config.name.length === 0) {
    throw invalidConfig(
      'Scaffold name must be a non-empty string',
      'Use unscoped kebab-case, e.g. "my-search" (scoped packages are not supported yet).',
    )
  }
  if (hasNul(config.name)) {
    throw invalidConfig('Scaffold name must not contain NUL bytes')
  }
  if (!SAFE_PACKAGE_NAME.test(config.name)) {
    throw invalidConfig(
      `Scaffold name "${config.name}" is not a safe unscoped npm package id`,
      'Must start with a lowercase letter; only lowercase alphanumerics and single hyphens between segments. No scopes (@), slashes, dots, spaces, or uppercase.',
    )
  }

  if (typeof config.dir !== 'string' || config.dir.trim().length === 0) {
    throw invalidConfig('Scaffold dir must be a non-empty string')
  }
  if (hasNul(config.dir)) {
    throw invalidConfig('Scaffold dir must not contain NUL bytes')
  }

  if (config.description !== undefined) {
    if (typeof config.description !== 'string') {
      throw invalidConfig('Scaffold description must be a string when provided')
    }
    if (hasNul(config.description)) {
      throw invalidConfig('Scaffold description must not contain NUL bytes')
    }
    if (config.description.length > MAX_DESCRIPTION_LENGTH) {
      throw invalidConfig(
        `Scaffold description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
      )
    }
  }

  if (config.overwrite !== undefined && typeof config.overwrite !== 'boolean') {
    throw invalidConfig('Scaffold overwrite must be a boolean when provided')
  }
}
