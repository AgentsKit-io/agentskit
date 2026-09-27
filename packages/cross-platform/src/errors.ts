import { AgentsKitError } from '@agentskit/core'

const DOCS_URL = 'https://www.agentskit.io/docs/reference/packages/cross-platform'

export const CrossPlatformErrorCodes = {
  AK_PLATFORM_PERMISSION_DENIED: 'AK_PLATFORM_PERMISSION_DENIED',
  AK_PLATFORM_COMMAND_NOT_FOUND: 'AK_PLATFORM_COMMAND_NOT_FOUND',
  AK_PLATFORM_SPAWN_FAILED: 'AK_PLATFORM_SPAWN_FAILED',
  AK_PLATFORM_INVALID_INPUT: 'AK_PLATFORM_INVALID_INPUT',
  AK_PLATFORM_UNSUPPORTED_RUNTIME: 'AK_PLATFORM_UNSUPPORTED_RUNTIME',
} as const

export type CrossPlatformErrorCode = (typeof CrossPlatformErrorCodes)[keyof typeof CrossPlatformErrorCodes]

export class CrossPlatformError extends AgentsKitError {
  constructor(options: {
    code: CrossPlatformErrorCode
    message: string
    hint?: string
    docsUrl?: string
    cause?: unknown
  }) {
    super({ docsUrl: DOCS_URL, ...options })
    this.name = 'CrossPlatformError'
  }
}

/** Deno permission kinds, as spelled in its `--allow-*` flags. */
export type DenoPermission = 'run' | 'read' | 'write' | 'env' | 'sys'

function errorName(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const name = (error as { name?: unknown }).name
  return typeof name === 'string' ? name : undefined
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

/**
 * True for Deno's permission failures: `NotCapable` (Deno 2) and
 * `PermissionDenied` (Deno 1 and some node: compat paths).
 */
export function isPermissionError(error: unknown): boolean {
  const name = errorName(error)
  return name === 'NotCapable' || name === 'PermissionDenied'
}

/** True when the OS or runtime reports that the command/file does not exist. */
export function isNotFoundError(error: unknown): boolean {
  return errorCode(error) === 'ENOENT' || errorName(error) === 'NotFound'
}

/** Build the typed error raised when Deno refuses an operation. */
export function permissionDenied(permission: DenoPermission, target: string, cause: unknown): CrossPlatformError {
  return new CrossPlatformError({
    code: CrossPlatformErrorCodes.AK_PLATFORM_PERMISSION_DENIED,
    message: `Permission denied: ${permission} access to "${target}"`,
    hint: `Run Deno with --allow-${permission}=${target} (or --allow-${permission}).`,
    cause,
  })
}

/**
 * Map a runtime failure to a typed error. Deno permission errors become
 * AK_PLATFORM_PERMISSION_DENIED; anything else is returned unchanged.
 */
export function mapRuntimeError(error: unknown, permission: DenoPermission, target: string): unknown {
  return isPermissionError(error) ? permissionDenied(permission, target, error) : error
}
