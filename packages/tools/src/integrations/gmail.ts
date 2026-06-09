import type { ToolDefinition } from '@agentskit/core'
import { gmailIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'
import type { HttpToolOptions } from './http'

/** @deprecated Moved to `@agentskit/integrations` (services/gmail). */
export interface GmailConfig extends HttpToolOptions {
  /** OAuth access token for the Gmail API (scope: gmail.readonly / gmail.send). */
  accessToken: string
  /** User id, usually 'me'. */
  userId?: string
}

function cfg(config: GmailConfig): ProjectionConfig {
  return {
    credential: config.accessToken,
    config: { userId: config.userId },
    baseUrl: config.baseUrl,
    headers: config.headers,
    timeoutMs: config.timeoutMs,
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function gmailListMessages(config: GmailConfig): ToolDefinition {
  return toToolDefinitions(gmailIntegration, cfg(config)).find((t) => t.name === 'gmail_list_messages')!
}

/** @deprecated import from `@agentskit/integrations`. */
export function gmailSendEmail(config: GmailConfig): ToolDefinition {
  return toToolDefinitions(gmailIntegration, cfg(config)).find((t) => t.name === 'gmail_send_email')!
}

/** @deprecated import from `@agentskit/integrations`. */
export function gmail(config: GmailConfig): ToolDefinition[] {
  return toToolDefinitions(gmailIntegration, cfg(config))
}
