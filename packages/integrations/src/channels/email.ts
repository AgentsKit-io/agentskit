import { verifySvix } from '../webhook-verify'
import type { Channel, ChannelOptionsBase } from './types'
import { readResponseText } from '../http-body'
import { arr, parseBody, postJson, rec, str, withSecret, type Rec } from './shared'

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

/** Resend ids are UUIDs; reject anything else before it reaches a request URL. */
function isSafeEmailId(id: string): boolean {
  if (id.length === 0 || id.length > 128) return false
  for (const ch of id) {
    const ok = (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '-' || ch === '_'
    if (!ok) return false
  }
  return true
}

/** Crude tag stripper (no regex: input is attacker-controlled). */
function stripHtml(html: string): string {
  let out = ''
  let inTag = false
  for (const ch of html) {
    if (ch === '<') inTag = true
    else if (ch === '>') inTag = false
    else if (!inTag) out += ch
  }
  return out.trim()
}

/** Email channel: inbound via Resend `email.received` webhook, outbound via Resend. */
export function emailChannel(options: EmailChannelOptions): Channel {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const fetchReceived = async (emailId: string): Promise<Rec | undefined> => {
    try {
      const res = await fetchImpl(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
        headers: { authorization: `Bearer ${options.resendApiKey}` },
      })
      return res.ok ? parseBody(await readResponseText(res)) : undefined
    } catch {
      return undefined
    }
  }
  return {
    name: 'email',
    verify: (input) =>
      withSecret(options.webhookSecret, () => verifySvix({ nowSeconds: options.nowSeconds?.(), ...input, secret: options.webhookSecret })),
    receive: async (rawBody) => {
      const body = parseBody(rawBody)
      const data = rec(body?.data)
      if (body?.type !== 'email.received' || !data) return []
      const sender = str(data.from) ?? ''
      const { address, name } = parseSender(sender)
      const emailId = str(data.email_id)
      // The webhook only carries metadata; the body lives in the Received Emails API.
      const full = emailId && isSafeEmailId(emailId) ? await fetchReceived(emailId) : undefined
      const text = str(full?.text)?.trim() || stripHtml(str(full?.html) ?? '') || str(data.subject) || ''
      return [{
        channel: 'email',
        id: str(data.email_id) ?? str(data.message_id) ?? '',
        from: { id: address, name },
        conversationId: address,
        threadId: str(data.message_id),
        text,
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
