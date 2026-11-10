/** File attachment accepted by the email transport. */
export interface EmailAttachment {
  filename: string
  /** UTF-8 text contents. Use `contentBase64` for binary. */
  content?: string
  contentBase64?: string
  contentType?: string
}

/** Outbound message data passed to the email transport. */
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

/** Provider result returned after sending an email. */
export interface EmailSendResult {
  messageId: string
  accepted?: string[]
  rejected?: string[]
}

/** Host-provided transport used by the email integration to send messages. */
export interface EmailTransport {
  send: (msg: EmailSendMessage) => Promise<EmailSendResult>
}

/** Email message returned by the IMAP client. */
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

/** Filters and result limit for an IMAP message fetch. */
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

/** Host-provided client used to fetch messages from an IMAP mailbox. */
export interface ImapClient {
  fetch: (opts: ImapFetchOptions) => Promise<EmailMessage[]>
}

/** Optional send and receive transports used by the email integration. */
export interface EmailConfig {
  transport?: EmailTransport
  imap?: ImapClient
  /** Default mailbox for fetch. Default 'INBOX'. */
  defaultMailbox?: string
  /** Hard cap applied to fetch limits. Default 200. */
  maxFetch?: number
}
