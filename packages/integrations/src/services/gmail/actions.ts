import { defineAction } from '../../contract'

interface GmailConfig {
  userId?: string
}

function userOf(config: unknown): string {
  return (config as GmailConfig | undefined)?.userId ?? 'me'
}

function toBase64Url(input: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(input, 'utf8').toString('base64url')
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const gmailListMessages = defineAction({
  name: 'gmail_list_messages',
  description: 'List Gmail messages matching a Gmail search query.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Gmail search string, e.g. "is:unread from:boss"' },
      max_results: { type: 'number' },
    },
    required: ['q'],
  },
  async execute(args, { http, config }) {
    const result = await http<{ messages?: Array<{ id: string; threadId: string }> }>({
      path: `/users/${userOf(config)}/messages`,
      query: { q: String(args.q), maxResults: (args.max_results as number) ?? 20 },
    })
    return result.messages ?? []
  },
})

export const gmailSendEmail = defineAction({
  name: 'gmail_send_email',
  description: 'Send an email via Gmail.',
  sideEffect: 'external',
  sendCapability: 'messages.send',
  schema: {
    type: 'object',
    properties: {
      to: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      from: { type: 'string' },
    },
    required: ['to', 'subject', 'body'],
  },
  async execute(args, { http, config }) {
    const headers = [
      `To: ${args.to}`,
      args.from ? `From: ${args.from}` : '',
      `Subject: ${args.subject}`,
      'Content-Type: text/plain; charset=utf-8',
    ]
      .filter(Boolean)
      .join('\r\n')
    const raw = toBase64Url(`${headers}\r\n\r\n${args.body}`)
    const result = await http<{ id: string; threadId: string }>({
      method: 'POST',
      path: `/users/${userOf(config)}/messages/send`,
      body: { raw },
    })
    return { id: result.id, threadId: result.threadId }
  },
})

export const gmailActions = [gmailListMessages, gmailSendEmail]
