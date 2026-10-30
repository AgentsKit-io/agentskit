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

/** Splits `Name <addr>` without regexes (inbound `from` is attacker-controlled). */
function parseSender(sender: string): { address: string; name?: string } {
  const trimmed = sender.trim()
  const open = trimmed.lastIndexOf('<')
  if (!trimmed.endsWith('>') || open < 0) return { address: sender }
  let name = trimmed.slice(0, open).trim()
  if (name.startsWith('"')) name = name.slice(1)
  if (name.endsWith('"')) name = name.slice(0, -1)
  return { address: trimmed.slice(open + 1, -1), name: name || undefined }
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
      const { address, name } = parseSender(sender)
      return [{
        channel: 'email',
        id: str(data.email_id) ?? str(data.message_id) ?? '',
        from: { id: address, name },
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
