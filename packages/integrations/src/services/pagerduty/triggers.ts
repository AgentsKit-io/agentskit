import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyPagerDuty } from '../../webhook-verify'

export const pagerdutyEvent = defineTrigger({
  name: 'pagerduty.event',
  source: 'pagerduty',
  verify: verifyPagerDuty,
  normalize: (raw): NormalizedEvent => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return invalidJsonEvent(raw)
    const json = parsed.value as { event?: { event_type?: string; data?: unknown } }
    return { kind: json.event?.event_type ?? 'unknown', payload: json.event?.data ?? json, raw }
  },
})

export const pagerdutyTriggers = [pagerdutyEvent]
