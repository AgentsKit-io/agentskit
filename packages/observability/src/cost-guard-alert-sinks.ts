import { assertFinitePositive } from './cost-guard'
import type { CostAlertEvent, CostAlertSink } from './cost-guard-advanced-types'

function resolveGlobalFetch(): typeof fetch | undefined {
  const candidate = (globalThis as { fetch?: unknown }).fetch
  return typeof candidate === 'function' ? (candidate as typeof fetch) : undefined
}

/**
 * Create an alert sink that writes cost alert details to stderr.
 * @returns A sink that formats one concise line for each alert.
 */
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

/** HTTP and retry settings for `webhookAlertSink`. */
export interface WebhookAlertSinkOptions {
  url: string
  /** Override fetch (tests / custom clients). */
  fetch?: typeof fetch
  /** Optional bearer / signing header. */
  headers?: Record<string, string>
}

/**
 * Create a sink that posts cost alerts as JSON to a webhook endpoint.
 * @param options Endpoint and optional fetch implementation and headers.
 * @returns An async sink that rejects when the HTTP response is not successful.
 */
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
 * Throttle alerts by tenant, window, type, and threshold for the given interval.
 * @param sink Sink to wrap.
 * @param windowMs Minimum interval between matching alerts.
 * @param now Clock used to compare alert times; defaults to `Date.now`.
 * @returns A sink that forwards at most one matching alert per interval.
 * @throws {ConfigError} When `windowMs` is not finite and positive.
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
