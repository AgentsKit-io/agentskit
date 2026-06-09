import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'
import type { EmailAttachment, EmailConfig } from './types'

function asArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value : [value]
}

export const emailSend = defineAction({
  name: 'email_send',
  description: 'Send an email via the configured SMTP transport.',
  sideEffect: 'external',
  sendCapability: 'smtp.send',
  requiresConfirmation: true,
  schema: {
    type: 'object',
    properties: {
      from: { type: 'string' },
      to: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
      cc: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
      bcc: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
      subject: { type: 'string' },
      text: { type: 'string' },
      html: { type: 'string' },
      attachments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            filename: { type: 'string' },
            content: { type: 'string' },
            contentBase64: { type: 'string' },
            contentType: { type: 'string' },
          },
          required: ['filename'],
        },
      },
    },
    required: ['from', 'to', 'subject'],
  },
  async execute(args, { config }) {
    const transport = (config as EmailConfig | undefined)?.transport
    if (!transport) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'email_send: no SMTP transport configured',
        hint: 'Provide an EmailTransport adapter (e.g. wrap nodemailer.createTransport).',
      })
    }
    const text = typeof args.text === 'string' ? args.text : undefined
    const html = typeof args.html === 'string' ? args.html : undefined
    if (!text && !html) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'email_send: provide text or html body' })
    }
    const to = asArray(args.to as string | string[])
    if (!to || to.length === 0) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'email_send: to is required' })
    }
    try {
      const result = await transport.send({
        from: String(args.from),
        to,
        cc: asArray(args.cc as string | string[] | undefined),
        bcc: asArray(args.bcc as string | string[] | undefined),
        subject: String(args.subject),
        text,
        html,
        attachments: Array.isArray(args.attachments) ? (args.attachments as EmailAttachment[]) : undefined,
      })
      return { messageId: result.messageId, accepted: result.accepted ?? [], rejected: result.rejected ?? [] }
    } catch (err) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `email_send: ${err instanceof Error ? err.message : String(err)}`,
        hint: 'Verify SMTP host, credentials, and that the transport adapter resolves errors as exceptions.',
      })
    }
  },
})

export const emailFetch = defineAction({
  name: 'email_fetch',
  description: 'Fetch a batch of recent IMAP messages matching an optional filter.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: {
      mailbox: { type: 'string' },
      unseen_only: { type: 'boolean' },
      since: { type: 'string', description: 'ISO date string. Only return messages on/after this date.' },
      from: { type: 'string' },
      subject: { type: 'string' },
      limit: { type: 'number' },
    },
  },
  async execute(args, { config }) {
    const cfg = config as EmailConfig | undefined
    const client = cfg?.imap
    if (!client) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: 'email_fetch: no IMAP client configured',
        hint: 'Provide an ImapClient adapter (e.g. wrap imapflow.fetch).',
      })
    }
    const defaultMailbox = cfg.defaultMailbox ?? 'INBOX'
    const maxFetch = Math.max(1, cfg.maxFetch ?? 200)
    const requested = typeof args.limit === 'number' ? args.limit : 50
    const limit = Math.min(maxFetch, Math.max(1, requested))
    const messages = await client.fetch({
      mailbox: typeof args.mailbox === 'string' ? args.mailbox : defaultMailbox,
      unseenOnly: args.unseen_only === true,
      since: typeof args.since === 'string' ? args.since : undefined,
      from: typeof args.from === 'string' ? args.from : undefined,
      subject: typeof args.subject === 'string' ? args.subject : undefined,
      limit,
    })
    return { count: messages.length, truncated: messages.length >= limit, messages }
  },
})

export const emailActions = [emailSend, emailFetch]
