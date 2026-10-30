import { verifyHmacSha256Body } from '../webhook-verify'
import type { Channel, ChannelAttachment, ChannelOptionsBase } from './types'
import { arr, parseBody, postJson, rec, str } from './shared'

/** Credentials and transport for {@link whatsappChannel}. */
export interface WhatsAppChannelOptions extends ChannelOptionsBase {
  /** Meta app secret used to sign webhooks (`x-hub-signature-256`). */
  appSecret: string
  accessToken: string
  phoneNumberId: string
  apiVersion?: string
}

const MEDIA_TYPES = ['image', 'document', 'audio', 'video', 'sticker'] as const

/** WhatsApp Cloud API channel. */
export function whatsappChannel(options: WhatsAppChannelOptions): Channel {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const base = `https://graph.facebook.com/${options.apiVersion ?? 'v21.0'}/${options.phoneNumberId}/messages`
  return {
    name: 'whatsapp',
    verify: (input) => verifyHmacSha256Body({ ...input, secret: options.appSecret }, 'x-hub-signature-256', 'sha256='),
    receive: (rawBody) => {
      const body = parseBody(rawBody)
      const out = []
      for (const entry of arr(body?.entry)) {
        for (const change of arr(entry.changes)) {
          const value = rec(change.value)
          const contacts = arr(value?.contacts)
          for (const m of arr(value?.messages)) {
            const from = str(m.from) ?? ''
            const profileName = str(rec(contacts.find((c) => str(c.wa_id) === from)?.profile)?.name)
            const attachments: ChannelAttachment[] = []
            let text = str(rec(m.text)?.body) ?? ''
            for (const type of MEDIA_TYPES) {
              const media = rec(m[type])
              if (!media) continue
              attachments.push({
                id: str(media.id),
                contentType: str(media.mime_type),
                name: str(media.filename),
              })
              text ||= str(media.caption) ?? ''
            }
            const ts = str(m.timestamp)
            out.push({
              channel: 'whatsapp',
              id: str(m.id) ?? '',
              from: { id: from, name: profileName },
              conversationId: from,
              text,
              attachments,
              receivedAt: ts ? new Date(Number(ts) * 1000).toISOString() : undefined,
              raw: m,
            })
          }
        }
      }
      return out
    },
    send: async (message) => {
      await postJson('whatsapp', fetchImpl, base, { authorization: `Bearer ${options.accessToken}` }, {
        messaging_product: 'whatsapp',
        to: message.conversationId,
        type: 'text',
        text: { body: message.text },
      })
    },
  }
}
