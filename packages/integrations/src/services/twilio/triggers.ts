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
    const kind = form.MessageSid ? 'message' : form.CallSid ? 'call' : 'unknown'
    return { kind, payload: form, raw }
  },
})

export const twilioTriggers = [twilioEvent]
