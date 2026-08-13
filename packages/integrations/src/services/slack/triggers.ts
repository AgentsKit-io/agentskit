import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifySlack } from '../../webhook-verify'

interface SlackEnvelope {
  type?: string
  team_id?: string
  event?: { type?: string; channel?: string; user?: string; text?: string; thread_ts?: string }
}

export const slackEvent = defineTrigger({
  name: 'slack.event',
  source: 'slack',
  verify: verifySlack,
  normalize: (raw): NormalizedEvent => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return invalidJsonEvent(raw)
    const env = parsed.value as SlackEnvelope
    const kind = env.event?.type ?? env.type ?? 'unknown'
    return { kind, payload: { teamId: env.team_id, channel: env.event?.channel, user: env.event?.user, text: env.event?.text, threadTs: env.event?.thread_ts }, raw }
  },
  externalThreadRef: (raw) => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return undefined
    const env = parsed.value as SlackEnvelope
    const ts = env.event?.thread_ts
    const channel = env.event?.channel
    if (!ts || !channel) return undefined
    return { kind: 'slack.thread', id: `${channel}:${ts}`, parentId: channel }
  },
})

export const slackTriggers = [slackEvent]
