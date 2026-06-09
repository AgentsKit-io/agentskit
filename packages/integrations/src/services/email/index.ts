import { defineIntegration } from '../../contract'
import { registerIntegration } from '../../registry'
import { emailActions } from './actions'

export const emailIntegration = defineIntegration({
  name: 'email',
  displayName: 'Email (SMTP/IMAP)',
  categories: ['comms'],
  // Driver-injected (SMTP transport / IMAP client) via ctx.config; no base URL.
  auth: { kind: 'none' },
  actions: emailActions,
  capabilities: { send: 'email_send', notify: 'email_send' },
})

registerIntegration(emailIntegration)

export type {
  EmailAttachment,
  EmailSendMessage,
  EmailSendResult,
  EmailTransport,
  EmailMessage,
  ImapFetchOptions,
  ImapClient,
  EmailConfig,
} from './types'
