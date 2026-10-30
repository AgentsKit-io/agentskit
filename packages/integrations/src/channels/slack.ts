import { ErrorCodes, ToolError } from '@agentskit/core'
import { verifySlack } from '../webhook-verify'
import type { Channel, ChannelOptionsBase } from './types'
import { arr, parseBody, postJson, rec, str } from './shared'

/** Credentials and transport for {@link slackChannel}. */
export interface SlackChannelOptions extends ChannelOptionsBase {
  botToken: string
  signingSecret: string
}

/** Slack Events API channel (`message` / `app_mention`; bot echoes are flagged `isBot`). */
export function slackChannel(options: SlackChannelOptions): Channel {
  const fetchImpl = options.fetch ?? globalThis.fetch
  return {
    name: 'slack',
    verify: (input) =>
      verifySlack({ nowSeconds: options.nowSeconds?.(), ...input, secret: options.signingSecret }),
    receive: (rawBody) => {
      const env = parseBody(rawBody)
      const e = rec(env?.event)
      if (env?.type !== 'event_callback' || !e) return []
      if (e.type !== 'message' && e.type !== 'app_mention') return []
      const ts = str(e.ts) ?? ''
      const sec = Number(ts)
      return [{
        channel: 'slack',
        id: str(env.event_id) ?? ts,
        from: { id: str(e.user) ?? str(e.bot_id) ?? '', isBot: e.bot_id !== undefined },
        conversationId: str(e.channel) ?? '',
        threadId: str(e.thread_ts),
        text: str(e.text) ?? '',
        attachments: arr(e.files).map((f) => ({
          id: str(f.id),
          name: str(f.name),
          contentType: str(f.mimetype),
          url: str(f.url_private),
          sizeBytes: Number(f.size) || undefined,
        })),
        receivedAt: Number.isFinite(sec) && sec > 0 ? new Date(sec * 1000).toISOString() : undefined,
        raw: e,
      }]
    },
    send: async (message) => {
      const res = await postJson('slack', fetchImpl, 'https://slack.com/api/chat.postMessage', { authorization: `Bearer ${options.botToken}` }, {
        channel: message.conversationId,
        text: message.text,
        thread_ts: message.threadId,
      })
      if (res.ok === false) throw new ToolError({
        code: ErrorCodes.AK_TOOL_EXEC_FAILED,
        message: `slack: chat.postMessage failed: ${str(res.error) ?? 'unknown'}`,
      })
    },
  }
}
