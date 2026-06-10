import { defineTrigger, type NormalizedEvent } from '../../contract'
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
    const json = (typeof raw === 'string' ? JSON.parse(raw) : raw) as LinearEnvelope
    return { kind: `${json.type ?? 'unknown'}.${json.action ?? 'unknown'}`, payload: { action: json.action, resourceType: json.type, identifier: json.data?.identifier, title: json.data?.title, state: json.data?.state?.name }, raw }
  },
})

export const linearTriggers = [linearEvent]
