import { ErrorCodes, ToolError } from '@agentskit/core'
import { defineAction } from '../../contract'

export interface TwilioRuntimeConfig {
  accountSid: string
  authToken: string
  /** Default `from` number in E.164 format. */
  fromNumber: string
  baseUrl?: string
}

const E164 = /^\+[1-9]\d{6,14}$/

function assertE164(label: string, value: string): void {
  if (!E164.test(value)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `twilio: ${label} must be E.164 (e.g. +14155551234), got "${value}"`,
    })
  }
}

export const twilioSendSms = defineAction({
  name: 'twilio_send_sms',
  description: 'Send an SMS via Twilio. Returns Twilio message SID + status.',
  sideEffect: 'external',
  sendCapability: 'messages.create',
  schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient phone number in E.164 format.' },
      body: { type: 'string', description: 'Message body (max 1600 chars; Twilio segments at 160).' },
      from: { type: 'string', description: 'Override sender number (E.164). Defaults to the config fromNumber.' },
    },
    required: ['to', 'body'],
  },
  async execute(args, { fetch, config }) {
    const cfg = config as TwilioRuntimeConfig
    assertE164('to', String(args.to))
    const sender = args.from ? String(args.from) : cfg.fromNumber
    assertE164('from', sender)
    const baseUrl = cfg.baseUrl ?? 'https://api.twilio.com'
    const auth = `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64')}`
    const params = new URLSearchParams({ To: String(args.to), From: sender, Body: String(args.body) })
    const url = `${baseUrl}/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = (await response.json()) as { sid?: string; status?: string; message?: string; code?: number }
    if (!response.ok) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `twilio: ${data.code ?? response.status} ${data.message ?? 'request failed'}`,
        hint: `URL ${url}. Status ${response.status}.`,
      })
    }
    return { sid: data.sid, status: data.status }
  },
})

export const twilioActions = [twilioSendSms]
