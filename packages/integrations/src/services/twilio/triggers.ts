import { defineTrigger, type NormalizedEvent } from '../../contract'
import { verifyTwilio } from '../../webhook-verify'

export const twilioEvent = defineTrigger({
  name: 'twilio.event',
  source: 'twilio',
  verify: verifyTwilio,
  normalize: (raw): NormalizedEvent => {
    // Twilio inbound bodies are application/x-www-form-urlencoded.
    const form: Record<string, string> = {}
    if (typeof raw === 'string') {
      for (const [k, v] of new URLSearchParams(raw)) form[k] = v
    } else if (raw && typeof raw === 'object') {
      Object.assign(form, raw as Record<string, string>)
    }
    let kind = 'unknown'
    if (form.MessageSid) kind = 'message'
    else if (form.CallSid) kind = 'call'
    return { kind, payload: form, raw }
  },
})

export const twilioTriggers = [twilioEvent]
