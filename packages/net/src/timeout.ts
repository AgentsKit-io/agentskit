import { NetError, NetErrorCodes, invalidInput } from './errors'

/**
 * A signal that aborts when any input signal aborts, with the first reason.
 * Uses `AbortSignal.any` when the runtime has it.
 */
export function anySignal(signals: readonly (AbortSignal | undefined)[]): AbortSignal {
  const present = signals.filter((signal): signal is AbortSignal => signal !== undefined)
  if (present.length === 1) return present[0]!
  const native = (AbortSignal as { any?: (signals: AbortSignal[]) => AbortSignal }).any
  if (native) return native(present)
  const controller = new AbortController()
  for (const signal of present) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

/**
 * A signal that aborts after `ms` (with a `TimeoutError` reason) or when
 * `parent` aborts, whichever comes first.
 */
export function timeoutSignal(ms: number, parent?: AbortSignal): AbortSignal {
  if (!Number.isFinite(ms) || ms <= 0) throw invalidInput('timeout must be a positive number of milliseconds')
  const timeout = AbortSignal.timeout(ms)
  return parent ? anySignal([parent, timeout]) : timeout
}

/**
 * Run asynchronous work with a deadline and a signal that combines timeout
 * and caller cancellation. The wrapper rejects at the deadline even when work
 * ignores the signal, but it cannot forcibly stop uncooperative work. Parent
 * aborts reject with the exact parent reason; successful results and original
 * work failures pass through unchanged.
 *
 * @param work Work that receives the combined cancellation signal.
 * @param ms Positive timeout in milliseconds no greater than 2,147,483,647.
 * @param parent Optional caller signal. Defaults to no parent signal.
 * @returns The work result, or a rejection for timeout, caller abort, or work failure.
 * @throws {NetError} With code AK_NET_TIMEOUT when the deadline elapses.
 * @throws {NetError} With code AK_NET_INVALID_INPUT when `ms` is not positive, finite, or no greater than 2,147,483,647.
 * @throws {unknown} With the exact parent signal reason when the caller aborts.
 * @since 0.2.0
 * @example
 * ```ts
 * import { withTimeout } from '@agentskit/net'
 *
 * const parent = new AbortController()
 * const response = await withTimeout(
 *   signal => fetch('https://api.example.com/data', { signal }),
 *   5_000,
 *   parent.signal,
 * )
 * ```
 */
export async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  parent?: AbortSignal,
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0 || ms > 2_147_483_647) {
    throw invalidInput('timeout must be greater than 0 and no greater than 2147483647 milliseconds')
  }
  if (parent?.aborted) throw parent.reason

  const controller = new AbortController()
  let rejectAbort!: (reason: unknown) => void
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject
  })
  const onAbort = () => rejectAbort(controller.signal.reason)
  const onParentAbort = () => controller.abort(parent?.reason)
  controller.signal.addEventListener('abort', onAbort, { once: true })
  parent?.addEventListener('abort', onParentAbort, { once: true })
  const timer = setTimeout(() => {
    controller.abort(
      new NetError({
        code: NetErrorCodes.AK_NET_TIMEOUT,
        message: `Operation timed out after ${ms} ms`,
      }),
    )
  }, ms)

  try {
    const result = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw controller.signal.reason
      return work(controller.signal)
    })
    return await Promise.race([aborted, result])
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener('abort', onAbort)
    parent?.removeEventListener('abort', onParentAbort)
  }
}
