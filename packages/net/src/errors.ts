import { AgentsKitError } from '@agentskit/core'

const DOCS_URL = 'https://www.agentskit.io/docs/reference/packages/net'

export const NetErrorCodes = {
  AK_NET_TIMEOUT: 'AK_NET_TIMEOUT',
  AK_NET_BODY_TOO_LARGE: 'AK_NET_BODY_TOO_LARGE',
  AK_NET_BLOCKED_ADDRESS: 'AK_NET_BLOCKED_ADDRESS',
  AK_NET_INVALID_INPUT: 'AK_NET_INVALID_INPUT',
  AK_NET_SSE_PARSE_FAILED: 'AK_NET_SSE_PARSE_FAILED',
} as const

export type NetErrorCode = (typeof NetErrorCodes)[keyof typeof NetErrorCodes]

export class NetError extends AgentsKitError {
  constructor(options: { code: NetErrorCode; message: string; hint?: string; cause?: unknown }) {
    super({ docsUrl: DOCS_URL, ...options })
    this.name = 'NetError'
  }
}

export function invalidInput(message: string): NetError {
  return new NetError({ code: NetErrorCodes.AK_NET_INVALID_INPUT, message })
}

/** True for the error a fetch/abort raises when its signal fires. */
export function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  return name === 'AbortError' || name === 'TimeoutError'
}
