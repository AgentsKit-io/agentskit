import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyHmacSha256Bare } from '../../webhook-verify'

interface LinearEnvelope {
  action?: 'create' | 'update' | 'remove'
  type?: string
  data?: { identifier?: string; title?: string; state?: { name?: string } }
}

export const linearEvent = defineTrigger({
  name: 'linear.event',
  source: 'linear',
  verify: (input) => verifyHmacSha256Bare(input, 'linear-signature'),
  normalize: (raw): NormalizedEvent => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return invalidJsonEvent(raw)
    const json = parsed.value as LinearEnvelope
    return { kind: `${json.type ?? 'unknown'}.${json.action ?? 'unknown'}`, payload: { action: json.action, resourceType: json.type, identifier: json.data?.identifier, title: json.data?.title, state: json.data?.state?.name }, raw }
  },
})

export const linearTriggers = [linearEvent]
