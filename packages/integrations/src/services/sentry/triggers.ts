import { defineTrigger, type NormalizedEvent } from '../../contract'
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
    const json = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { action?: string; data?: unknown }
    return { kind: json.action ?? 'unknown', payload: json.data ?? json, raw }
  },
})

export const sentryTriggers = [sentryEvent]
