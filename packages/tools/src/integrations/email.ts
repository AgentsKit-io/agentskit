import { ConfigError, ErrorCodes, type ToolDefinition } from '@agentskit/core'
import {
  emailIntegration,
  toToolDefinitions,
  type EmailConfig,
} from '@agentskit/integrations'

export type {
  EmailAttachment,
  EmailSendMessage,
  EmailSendResult,
  EmailTransport,
  EmailMessage,
  ImapFetchOptions,
  ImapClient,
  EmailConfig,
} from '@agentskit/integrations'

function project(config: EmailConfig, name: string): ToolDefinition {
  return toToolDefinitions(emailIntegration, { config }).find((t) => t.name === name)!
}

/** @deprecated Moved to `@agentskit/integrations` (services/email). */
export function emailSend(config: EmailConfig): ToolDefinition {
  if (!config.transport) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'emailSend: config.transport is required',
      hint: 'Provide an EmailTransport adapter (e.g. wrap nodemailer.createTransport).',
    })
  }
  return project(config, 'email_send')
}

/** @deprecated import from `@agentskit/integrations`. */
export function emailFetch(config: EmailConfig): ToolDefinition {
  if (!config.imap) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'emailFetch: config.imap is required',
      hint: 'Provide an ImapClient adapter (e.g. wrap imapflow.fetch).',
    })
  }
  return project(config, 'email_fetch')
}

/** @deprecated import from `@agentskit/integrations`. */
export function email(config: EmailConfig): ToolDefinition[] {
  const tools: ToolDefinition[] = []
  if (config.transport) tools.push(project(config, 'email_send'))
  if (config.imap) tools.push(project(config, 'email_fetch'))
  if (tools.length === 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'email: provide at least one of `transport` or `imap`',
    })
  }
  return tools
}
