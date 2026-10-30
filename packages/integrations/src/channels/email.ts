import { verifySvix } from '../webhook-verify'
import type { Channel, ChannelOptionsBase } from './types'
import { arr, parseBody, postJson, rec, str } from './shared'

/** Credentials and transport for {@link emailChannel}. */
export interface EmailChannelOptions extends ChannelOptionsBase {
  /** Resend API key (outbound). */
  resendApiKey: string
  /** Resend webhook signing secret, `whsec_...` (inbound). */
  webhookSecret: string
  /** Sender address for replies, e.g. `Agent <agent@example.com>`. */
  from: string
}

/** Email channel: inbound via Resend `email.received` webhook, outbound via Resend. */
export function emailChannel(options: EmailChannelOptions): Channel {
  const fetchImpl = options.fetch ?? globalThis.fetch
  return {
    name: 'email',
    verify: (input) => verifySvix({ nowSeconds: options.nowSeconds?.(), ...input, secret: options.webhookSecret }),
    receive: (rawBody) => {
      const body = parseBody(rawBody)
      const data = rec(body?.data)
      if (body?.type !== 'email.received' || !data) return []
      const sender = str(data.from) ?? ''
      const match = /^(.*?)\s*<([^>]+)>$/.exec(sender)
      const address = match?.[2] ?? sender
      return [{
        channel: 'email',
        id: str(data.email_id) ?? str(data.message_id) ?? '',
        from: { id: address, name: match?.[1]?.replace(/^"|"$/g, '') || undefined },
        conversationId: address,
        threadId: str(data.message_id),
        text: str(data.text) ?? str(data.subject) ?? '',
        attachments: arr(data.attachments).map((a) => ({
          id: str(a.id),
          name: str(a.filename),
          contentType: str(a.content_type),
        })),
        receivedAt: str(body.created_at),
        raw: data,
      }]
    },
    send: async (message) => {
      await postJson('email', fetchImpl, 'https://api.resend.com/emails', { authorization: `Bearer ${options.resendApiKey}` }, {
        from: options.from,
        to: [message.conversationId],
        subject: message.subject ?? 'Re: your message',
        text: message.text,
        headers: message.threadId ? { 'In-Reply-To': message.threadId } : undefined,
      })
    },
  }
}
