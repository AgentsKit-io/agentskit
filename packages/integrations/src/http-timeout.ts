import { ErrorCodes, ToolError } from '@agentskit/core'
import { anySignal, timeoutSignal } from '@agentskit/net'

const MAX_TIMEOUT_MS = 2_147_483_647

/**
 * Compose a caller signal with a request timeout and return explicit cleanup.
 * Cleanup detaches the compatibility relay so later aborts cannot affect the
 * returned signal. The native timeout signal expires on its own clock.
 *
 * @param timeoutMs Positive integer timeout from 1 through 2,147,483,647 ms.
 * @param outer Optional caller-owned cancellation signal.
 * @returns The composed signal and idempotent relay cleanup function.
 * @throws {ToolError} With code AK_TOOL_INVALID_INPUT when timeoutMs is outside the supported range.
 * @example
 * ```ts
 * import { composeTimeoutSignal } from '@agentskit/integrations'
 *
 * const parentController = new AbortController()
 * const request = composeTimeoutSignal(5_000, parentController.signal)
 * const url = 'https://api.example.com/status'
 * try {
 *   await fetch(url, { signal: request.signal })
 * } finally {
 *   request.cleanup()
 * }
 * ```
 *
 * @deprecated Use `timeoutSignal` or `anySignal` from `@agentskit/net`.
 * Removal is no earlier than `@agentskit/integrations@0.10.0` and 90 days after deprecation.
 */
export function composeTimeoutSignal(
  timeoutMs: number,
  outer?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: 'timeoutMs must be a positive integer within the supported timer range',
    })
  }
  const combined = outer?.aborted ? outer : anySignal([timeoutSignal(timeoutMs), outer])
  const controller = new AbortController()
  let active = true
  const relayAbort = () => {
    if (active) controller.abort(combined.reason)
  }
  if (combined.aborted) relayAbort()
  else combined.addEventListener('abort', relayAbort, { once: true })

  return {
    signal: controller.signal,
    cleanup: () => {
      active = false
      combined.removeEventListener('abort', relayAbort)
    },
  }
}
