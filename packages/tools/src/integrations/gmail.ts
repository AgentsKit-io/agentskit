import { defineTool } from '@agentskit/core'
import { httpJson, type HttpToolOptions } from './http'

export interface GmailConfig extends HttpToolOptions {
  /** OAuth access token for the Gmail API (scope: gmail.readonly / gmail.send). */
  accessToken: string
  /** User id, usually 'me'. */
  userId?: string
}

function opts(config: GmailConfig): HttpToolOptions {
  return {
    baseUrl: config.baseUrl ?? 'https://gmail.googleapis.com/gmail/v1',
    headers: { authorization: `Bearer ${config.accessToken}`, ...config.headers },
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

function toBase64Url(input: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(input, 'utf8').toString('base64url')
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function gmailListMessages(config: GmailConfig) {
  const base = opts(config)
  const user = config.userId ?? 'me'
  return defineTool({
    name: 'gmail_list_messages',
    description: 'List Gmail messages matching a Gmail search query.',
    schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Gmail search string, e.g. "is:unread from:boss"' },
        max_results: { type: 'number' },
      },
      required: ['q'],
    } as const,
    async execute({ q, max_results }) {
      const result = await httpJson<{ messages?: Array<{ id: string; threadId: string }> }>(base, {
        path: `/users/${user}/messages`,
        query: { q: String(q), maxResults: max_results ?? 20 },
      })
      return result.messages ?? []
    },
  })
}

export function gmailSendEmail(config: GmailConfig) {
  const base = opts(config)
  const user = config.userId ?? 'me'
  return defineTool({
    name: 'gmail_send_email',
    description: 'Send an email via Gmail.',
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
        from: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    } as const,
    async execute({ to, subject, body, from }) {
      const headers = [
        `To: ${to}`,
        from ? `From: ${from}` : '',
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
      ]
        .filter(Boolean)
        .join('\r\n')
      const raw = toBase64Url(`${headers}\r\n\r\n${body}`)
      const result = await httpJson<{ id: string; threadId: string }>(base, {
        method: 'POST',
        path: `/users/${user}/messages/send`,
        body: { raw },
      })
      return { id: result.id, threadId: result.threadId }
    },
  })
}

export function gmail(config: GmailConfig) {
  return [gmailListMessages(config), gmailSendEmail(config)]
}
