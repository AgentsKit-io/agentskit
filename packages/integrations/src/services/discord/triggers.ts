import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyDiscord } from '../../webhook-verify'

export const discordInteraction = defineTrigger({
  name: 'discord.interaction',
  source: 'discord',
  verify: verifyDiscord,
  normalize: (raw): NormalizedEvent => {
    const parsed = parseJsonRecord(raw)
    if (!parsed.ok) return invalidJsonEvent(raw)
    const json = parsed.value as { type?: number }
    let kind = 'unknown'
    if (json.type === 1) kind = 'ping'
    else if (typeof json.type === 'number') kind = 'interaction'
    return { kind, payload: json, raw }
  },
})

export const discordTriggers = [discordInteraction]
