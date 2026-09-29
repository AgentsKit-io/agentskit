import { invalidInput } from './errors'

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
