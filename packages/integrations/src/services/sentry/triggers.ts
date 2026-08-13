import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyHmacSha256Bare, headerValue } from '../../webhook-verify'

export const sentryEvent = defineTrigger({
  name: 'sentry.event',
  source: 'sentry',
  verify: (input) => {
    const resource = headerValue(input.headers, 'sentry-hook-resource')
    if (resource === undefined) return { ok: false, reason: 'missing sentry-hook-resource' }
    return verifyHmacSha256Bare(input, 'sentry-hook-signature')
  },
  normalize: (raw): NormalizedEvent => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return invalidJsonEvent(raw)
    const json = parsed.value as { action?: string; data?: unknown }
    return { kind: json.action ?? 'unknown', payload: json.data ?? json, raw }
  },
})

export const sentryTriggers = [sentryEvent]
