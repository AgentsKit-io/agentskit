import { defineTrigger, type NormalizedEvent } from '../../contract'
import { verifyPagerDuty } from '../../webhook-verify'

export const pagerdutyEvent = defineTrigger({
  name: 'pagerduty.event',
  source: 'pagerduty',
  verify: verifyPagerDuty,
  normalize: (raw): NormalizedEvent => {
    const json = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { event?: { event_type?: string; data?: unknown } }
    return { kind: json.event?.event_type ?? 'unknown', payload: json.event?.data ?? json, raw }
  },
})

export const pagerdutyTriggers = [pagerdutyEvent]
