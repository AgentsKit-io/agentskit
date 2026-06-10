import { defineTrigger, type NormalizedEvent } from '../../contract'
import { verifyDiscord } from '../../webhook-verify'

export const discordInteraction = defineTrigger({
  name: 'discord.interaction',
  source: 'discord',
  verify: verifyDiscord,
  normalize: (raw): NormalizedEvent => {
    const json = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { type?: number }
    const kind = json.type === 1 ? 'ping' : typeof json.type === 'number' ? 'interaction' : 'unknown'
    return { kind, payload: json, raw }
  },
})

export const discordTriggers = [discordInteraction]
