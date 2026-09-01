import type { HookEvent, HookHandler, HookPayload, HookResult } from '../plugins/types'

export interface HookDispatchResult {
  /** Final payload after any `modify` handlers. */
  payload: HookPayload
  /** True when any handler returned `block`. */
  blocked: boolean
  /** Block reason from the first blocking handler, if any. */
  reason?: string
}

/**
 * Runs every handler registered for an event in order. Handlers can:
 *   - `continue`: do nothing, pass payload through
 *   - `modify`:   replace the payload for subsequent handlers
 *   - `block`:    stop dispatch and surface a reason to the caller
 *
 * Handler failures block by default so enforcement hooks cannot fail open.
 */
export class HookDispatcher {
  private readonly handlers = new Map<HookEvent, HookHandler[]>()

  constructor(
    handlers: HookHandler[] = [],
    private readonly onError: (handler: HookHandler, err: unknown) => void = (_h, err) =>
      process.stderr.write(
        `[agentskit] hook error: ${err instanceof Error ? err.message : String(err)}\n`,
      ),
  ) {
    for (const handler of handlers) this.register(handler)
  }

  register(handler: HookHandler): void {
    const list = this.handlers.get(handler.event) ?? []
    list.push(handler)
    this.handlers.set(handler.event, list)
  }

  async dispatch(event: HookEvent, payload: HookPayload): Promise<HookDispatchResult> {
    const list = this.handlers.get(event) ?? []
    let current: HookPayload = { ...payload, event }

    for (const handler of list) {
      if (!this.matches(handler, current)) continue

      let result: HookResult
      try {
        result = await handler.run(current)
      } catch (err) {
        this.onError(handler, err)
        return { payload: current, blocked: true, reason: 'hook failed' }
      }

      if (result.decision === 'block') {
        return { payload: current, blocked: true, reason: result.reason }
      }
      if (result.decision === 'modify') {
        current = { ...result.payload, event }
      }
    }

    return { payload: current, blocked: false }
  }

  private matches(handler: HookHandler, payload: HookPayload): boolean {
    if (!handler.matcher) return true
    if (typeof handler.matcher === 'function') return handler.matcher(payload)
    return handler.matcher.test(String(payload.tool ?? payload.prompt ?? ''))
  }
}
