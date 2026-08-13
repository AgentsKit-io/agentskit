import { ErrorCodes, ToolError } from '@agentskit/core'
import { composeTimeoutSignal } from '../../http'
import { defineAction } from '../../contract'
import { messageCard, type TeamsAdaptiveCard, type TeamsMessageCard, type TeamsRuntimeConfig } from './cards'

export const teamsSendWebhook = defineAction({
  name: 'teams_send_webhook',
  description: 'Post a message or Adaptive Card to a Microsoft Teams channel via Incoming Webhook.',
  sideEffect: 'external',
  sendCapability: 'webhook.post',
  schema: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Plain text body. Ignored when `card` is provided.' },
      title: { type: 'string', description: 'Convenience: wrap into a MessageCard with this title.' },
      card: { type: 'object', description: 'Pre-built Adaptive Card or MessageCard payload.' },
    },
  },
  async execute(args, { fetch, config, signal }) {
    const webhook = (config as TeamsRuntimeConfig | undefined)?.webhook
    if (!webhook?.webhookUrl) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'teams_send_webhook: no webhookUrl configured' })
    }
    const text = typeof args.text === 'string' ? args.text : undefined
    const title = typeof args.title === 'string' ? args.title : undefined
    const card = (args.card ?? undefined) as TeamsAdaptiveCard | TeamsMessageCard | undefined
    let payload: Record<string, unknown>
    if (card) payload = { type: 'message', attachments: [card] }
    else if (text || title) payload = { type: 'message', attachments: [messageCard({ title, text })] }
    else throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'teams_send_webhook: provide text, title, or card' })

    let webhookUrl: URL
    try {
      webhookUrl = new URL(webhook.webhookUrl)
    } catch {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'teams_send_webhook: webhookUrl must be a valid HTTPS URL' })
    }
    if (webhookUrl.protocol !== 'https:') {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'teams_send_webhook: webhookUrl must use HTTPS' })
    }
    const { signal: requestSignal, cleanup } = composeTimeoutSignal(webhook.timeoutMs ?? 20_000, signal)
    try {
      const response = await fetch(webhookUrl.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...webhook.headers },
        body: JSON.stringify(payload),
        signal: requestSignal,
        redirect: 'error',
      })
      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `teams_send_webhook: HTTP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
          hint: 'Verify the webhook URL is current and the channel still exists.',
        })
      }
      return { ok: true, status: response.status }
    } finally {
      cleanup()
    }
  },
})

export const teamsSendBot = defineAction({
  name: 'teams_send_bot',
  description: 'Send a message or Adaptive Card via the configured Teams Bot Framework client.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      conversation_id: { type: 'string' },
      service_url: { type: 'string' },
      text: { type: 'string' },
      card: { type: 'object' },
      reply_to_id: { type: 'string', description: 'Activity id to reply in-thread.' },
    },
    required: ['conversation_id'],
  },
  async execute(args, { config, signal }) {
    const client = (config as TeamsRuntimeConfig | undefined)?.bot?.client
    if (!client) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'teams_send_bot: no bot client configured' })
    }
    const text = typeof args.text === 'string' ? args.text : undefined
    const card = (args.card ?? undefined) as TeamsAdaptiveCard | TeamsMessageCard | undefined
    if (!text && !card) {
      throw new ToolError({ code: ErrorCodes.AK_TOOL_INVALID_INPUT, message: 'teams_send_bot: provide text or card' })
    }
    try {
      const result = await client.send({
        conversationId: String(args.conversation_id),
        serviceUrl: typeof args.service_url === 'string' ? args.service_url : undefined,
        text,
        card,
        replyToId: typeof args.reply_to_id === 'string' ? args.reply_to_id : undefined,
        signal,
      })
      return { id: result.id, conversationId: result.conversationId }
    } catch (err) {
      throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `teams_send_bot: ${err instanceof Error ? err.message : String(err)}`,
        hint: 'Check Bot Framework credentials and that the conversation reference is still valid.',
      })
    }
  },
})

export const teamsActions = [teamsSendWebhook, teamsSendBot]
