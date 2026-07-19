import { assertFinitePositive } from './cost-guard'
import type { CostAlertEvent, CostAlertSink } from './cost-guard-advanced-types'

function resolveGlobalFetch(): typeof fetch | undefined {
  const candidate = (globalThis as { fetch?: unknown }).fetch
  return typeof candidate === 'function' ? (candidate as typeof fetch) : undefined
}

/** Console alert sink — `[cost:<type>] <tenant> <window> $<cost>/$<budget>`. */
export function consoleAlertSink(): CostAlertSink {
  return event => {
    const line = `[${event.type}] tenant=${event.tenant} window=${event.window} ` +
      `cost=$${event.costUsd.toFixed(4)} budget=$${event.budgetUsd.toFixed(4)} ` +
      `util=${(event.utilization * 100).toFixed(1)}%` +
      (event.threshold ? ` threshold=${(event.threshold * 100).toFixed(0)}%` : '') +
      (event.reason ? ` reason="${event.reason}"` : '')
    process.stderr.write(`${line}\n`)
  }
}

export interface WebhookAlertSinkOptions {
  url: string
  /** Override fetch (tests / custom clients). */
  fetch?: typeof fetch
  /** Optional bearer / signing header. */
  headers?: Record<string, string>
}

/** Generic webhook sink — POSTs the event JSON. Rejects on HTTP !ok. */
export function webhookAlertSink(options: WebhookAlertSinkOptions): CostAlertSink {
  // Prefer injected fetch; fall back to globalThis so missing global never ReferenceErrors.
  const fetchImpl = options.fetch ?? resolveGlobalFetch()
  return async event => {
    if (!fetchImpl) return
    const response = await fetchImpl(options.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
      body: JSON.stringify(event),
    })
    if (!response.ok) {
      throw new Error(`webhookAlertSink: HTTP ${response.status} for ${options.url}`)
    }
  }
}

/**
 * Throttle wrapper — at most one alert per (tenant, window, type)
 * per `windowMs`. Wrap any sink to bound emit rate.
 */
export function throttle(
  sink: CostAlertSink,
  windowMs: number,
  now: () => number = Date.now,
): CostAlertSink {
  assertFinitePositive('throttle', 'windowMs', windowMs)
  const lastFired = new Map<string, number>()
  return async (event: CostAlertEvent) => {
    const key = `${event.type}|${event.tenant}|${event.window}|${event.threshold ?? ''}`
    const t = now()
    const previous = lastFired.get(key)
    if (previous !== undefined && t - previous < windowMs) return
    lastFired.set(key, t)
    await sink(event)
  }
}
