/**
 * Credential rotation hook for adapters. Today rotating a provider key
 * means bouncing the runtime — unacceptable for 24/7 production.
 *
 * Adapters opt in by accepting `apiKey` as either a `string`, a
 * `() => string | Promise<string>`, or a `RotatingCredentials` holder.
 * The holder lets external code (Vault, AWS Secrets Manager, KMS)
 * push a new value without restart, and `refreshCredentials()` is the
 * one-call API that performs the swap and emits an audit event.
 *
 * Closes issue #799.
 */

export type CredentialResolver = () => string | Promise<string>

export interface RotatingCredentials {
  /** Resolve the current secret. Adapters call this on every request. */
  current: CredentialResolver
  /** Replace the in-memory secret. Returns the new value. */
  rotate: (next: string) => Promise<string>
  /** Subscribe to rotation events. Returns an unsubscribe handle. */
  onRotate: (handler: (event: CredentialRotationEvent) => void) => () => void
}

export interface CredentialRotationEvent {
  /** ISO timestamp of the rotation. */
  rotatedAt: string
  /** Stable id (e.g. provider name) for audit-log correlation. */
  id: string
  /** Last 4 chars of the new secret — useful for "did the rotation actually happen?" without leaking the key. */
  fingerprint: string
}

export interface CredentialRefreshable {
  /**
   * Adapters that support credential rotation expose this method.
   * Calling it replaces the in-memory secret. The next request uses
   * the new value; in-flight requests are unaffected.
   */
  refreshCredentials: (next: string) => Promise<void>
}

export function createRotatingCredentials(
  initial: string,
  options: { id: string },
): RotatingCredentials {
  let value = initial
  const handlers = new Set<(e: CredentialRotationEvent) => void>()

  return {
    current: () => value,
    rotate: async next => {
      value = next
      const event: CredentialRotationEvent = {
        rotatedAt: new Date().toISOString(),
        id: options.id,
        fingerprint: next.slice(-4),
      }
      for (const h of handlers) h(event)
      return next
    },
    onRotate: handler => {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
  }
}

/**
 * Refresh credentials on any object that implements
 * `CredentialRefreshable`. A no-op (with a debug log) if the adapter
 * doesn't support rotation, so callers can run the rotation playbook
 * across a heterogeneous set of adapters without branching.
 */
export async function refreshCredentials(
  adapter: unknown,
  next: string,
  options?: { id?: string; logger?: (msg: string) => void },
): Promise<boolean> {
  const log = options?.logger ?? ((msg: string) => console.log(msg))
  if (
    adapter &&
    typeof adapter === 'object' &&
    'refreshCredentials' in adapter &&
    typeof (adapter as CredentialRefreshable).refreshCredentials === 'function'
  ) {
    await (adapter as CredentialRefreshable).refreshCredentials(next)
    log(`[agentskit] credentials refreshed${options?.id ? ` (${options.id})` : ''}`)
    return true
  }
  log(`[agentskit] adapter does not support credential rotation; restart required${options?.id ? ` (${options.id})` : ''}`)
  return false
}
