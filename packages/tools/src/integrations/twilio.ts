import { ErrorCodes, ToolError, type ToolDefinition } from '@agentskit/core'
import { twilioIntegration, toToolDefinitions, type ProjectionConfig } from '@agentskit/integrations'

const E164 = /^\+[1-9]\d{6,14}$/

function assertFromNumber(value: string): void {
  if (!E164.test(value)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `twilio: fromNumber must be E.164 (e.g. +14155551234), got "${value}"`,
    })
  }
}

/** @deprecated Moved to `@agentskit/integrations` (services/twilio). */
export interface TwilioConfig {
  accountSid: string
  authToken: string
  /** Default `from` number in E.164 format (e.g. `+14155551234`). */
  fromNumber: string
  baseUrl?: string
  fetch?: typeof globalThis.fetch
}

function cfg(config: TwilioConfig): ProjectionConfig {
  assertFromNumber(config.fromNumber)
  return {
    config: {
      accountSid: config.accountSid,
      authToken: config.authToken,
      fromNumber: config.fromNumber,
      baseUrl: config.baseUrl,
    },
    fetch: config.fetch,
  }
}

/** @deprecated import from `@agentskit/integrations`. */
export function twilioSendSms(config: TwilioConfig): ToolDefinition {
  return toToolDefinitions(twilioIntegration, cfg(config)).find((t) => t.name === 'twilio_send_sms')!
}

/** @deprecated import from `@agentskit/integrations`. */
export function twilio(config: TwilioConfig): ToolDefinition[] {
  return toToolDefinitions(twilioIntegration, cfg(config))
}
