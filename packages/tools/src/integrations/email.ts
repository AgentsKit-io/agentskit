import { ConfigError, ErrorCodes, ToolError, defineTool } from '@agentskit/core'

/**
 * Provider-agnostic email tools (SMTP send + IMAP fetch). Heavy
 * drivers (nodemailer, imapflow, mailparser) are not bundled — pass
 * an `EmailTransport` and/or `ImapClient` adapter that wraps your
 * driver of choice. A reference nodemailer/imapflow adapter lives in
 * the AgentsKitOS triggers package.
 */

export interface EmailAttachment {
  filename: string
  /** UTF-8 text contents. Use `contentBase64` for binary. */
  content?: string
  contentBase64?: string
  contentType?: string
}

export interface EmailSendMessage {
  from: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: EmailAttachment[]
}

export interface EmailSendResult {
  messageId: string
  accepted?: string[]
  rejected?: string[]
}

export interface EmailTransport {
  send: (msg: EmailSendMessage) => Promise<EmailSendResult>
}

export interface EmailMessage {
  id: string
  uid?: number
  from: string
  to: string[]
  subject: string
  /** ISO 8601 timestamp. */
  date: string
  text?: string
  html?: string
  attachments?: Array<{ filename: string; contentType: string; size: number }>
}

export interface ImapFetchOptions {
  mailbox?: string
  unseenOnly?: boolean
  /** ISO date string. Only return messages on/after this date. */
  since?: string
  from?: string
  subject?: string
  /** Hard cap on returned messages. Default 50. */
  limit?: number
}

export interface ImapClient {
  fetch: (opts: ImapFetchOptions) => Promise<EmailMessage[]>
}

export interface EmailConfig {
  transport?: EmailTransport
  imap?: ImapClient
  /** Default mailbox for fetch. Default 'INBOX'. */
  defaultMailbox?: string
  /** Hard cap applied to fetch limits. Default 200. */
  maxFetch?: number
}

function asArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value : [value]
}

export function emailSend(config: EmailConfig) {
  if (!config.transport) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'emailSend: config.transport is required',
      hint: 'Provide an EmailTransport adapter (e.g. wrap nodemailer.createTransport).',
    })
  }
  const transport = config.transport
  return defineTool({
    name: 'email_send',
    description: 'Send an email via the configured SMTP transport.',
    schema: {
      type: 'object',
      properties: {
        from: { type: 'string' },
        to: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        cc: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
        bcc: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } },
          ],
        },
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
    } as const,
    requiresConfirmation: true,
    async execute(args) {
      const text = typeof args.text === 'string' ? args.text : undefined
      const html = typeof args.html === 'string' ? args.html : undefined
      if (!text && !html) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'email_send: provide text or html body',
        })
      }
      const to = asArray(args.to as string | string[])
      if (!to || to.length === 0) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'email_send: to is required',
        })
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
          attachments: Array.isArray(args.attachments)
            ? (args.attachments as EmailAttachment[])
            : undefined,
        })
        return {
          messageId: result.messageId,
          accepted: result.accepted ?? [],
          rejected: result.rejected ?? [],
        }
      } catch (err) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `email_send: ${err instanceof Error ? err.message : String(err)}`,
          hint: 'Verify SMTP host, credentials, and that the transport adapter resolves errors as exceptions.',
        })
      }
    },
  })
}

export function emailFetch(config: EmailConfig) {
  if (!config.imap) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'emailFetch: config.imap is required',
      hint: 'Provide an ImapClient adapter (e.g. wrap imapflow.fetch).',
    })
  }
  const client = config.imap
  const defaultMailbox = config.defaultMailbox ?? 'INBOX'
  const maxFetch = Math.max(1, config.maxFetch ?? 200)
  return defineTool({
    name: 'email_fetch',
    description: 'Fetch a batch of recent IMAP messages matching an optional filter.',
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
    } as const,
    async execute(args) {
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
      return {
        count: messages.length,
        truncated: messages.length >= limit,
        messages,
      }
    },
  })
}

export function email(config: EmailConfig) {
  const tools = []
  if (config.transport) tools.push(emailSend(config))
  if (config.imap) tools.push(emailFetch(config))
  if (tools.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'email: provide at least one of `transport` or `imap`',
    })
  }
  return tools
}
