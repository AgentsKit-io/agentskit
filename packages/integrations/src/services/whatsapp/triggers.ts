import { defineTrigger, type NormalizedEvent } from '../../contract'
import { invalidJsonEvent, parseJsonRecord } from '../../normalize'
import { verifyHmacSha256Body } from '../../webhook-verify'

interface WhatsAppValue {
  metadata?: { phone_number_id?: string }
  messages?: Array<{ id?: string; from?: string; type?: string; text?: { body?: string } }>
  statuses?: Array<{ id?: string; status?: string; recipient_id?: string }>
}

interface WhatsAppEnvelope {
  entry?: Array<{ changes?: Array<{ value?: WhatsAppValue }> }>
}

function valueOf(raw: unknown): WhatsAppValue | undefined {
  const parsed = parseJsonRecord(raw)
  if (!parsed.ok) return undefined
  const envelope = parsed.value as WhatsAppEnvelope
  return envelope.entry?.[0]?.changes?.[0]?.value
}

export const whatsappWebhook = defineTrigger({
  name: 'whatsapp.webhook',
  source: 'whatsapp',
  verify: (input) => verifyHmacSha256Body(input, 'x-hub-signature-256', 'sha256='),
  normalize: (raw): NormalizedEvent => {
    const value = valueOf(raw)
    if (!value) return invalidJsonEvent(raw)
    const message = value.messages?.[0]
    const status = value.statuses?.[0]
    let kind = 'unknown'
    if (message?.type) kind = 'message'
    else if (status?.status) kind = 'status'
    return {
      kind,
      payload: {
        phoneNumberId: value.metadata?.phone_number_id,
        messageId: message?.id ?? status?.id,
        from: message?.from,
        recipientId: status?.recipient_id,
        text: message?.text?.body,
        messageType: message?.type,
        status: status?.status,
      },
      raw,
    }
  },
  externalThreadRef: (raw) => {
    const value = valueOf(raw)
    const message = value?.messages?.[0]
    const phoneNumberId = value?.metadata?.phone_number_id
    if (!phoneNumberId || !message?.from) return undefined
    return { kind: 'whatsapp.thread', id: `${phoneNumberId}:${message.from}`, parentId: phoneNumberId }
  },
})

export const whatsappTriggers = [whatsappWebhook]
