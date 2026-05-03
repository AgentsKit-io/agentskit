import { createHmac, timingSafeEqual } from 'node:crypto'
import type { ChatSurfaceAdapter, ChatSurfaceEvent } from '@agentskit/runtime'

/**
 * Reference Slack adapter wrapping the standard Events API webhook
 * payload + Web API for replies. Intentionally driver-light — uses
 * `fetch` against `chat.postMessage` rather than pulling Bolt in.
 *
 * Production deployments should swap `fetch` reply for Bolt's
 * `app.client.chat.postMessage` so retries / rate-limit handling /
 * pagination come for free.
 */

export interface SlackAdapterOptions {
  /** Bot OAuth token (`xoxb-...`). */
  botToken: string
  /** Slack signing secret used to verify incoming Events API requests. */
  signingSecret: string
  /** Reject events older than this many seconds. Default 300 (5 min). */
  maxAgeSeconds?: number
  /** Override fetch (for tests). */
  fetch?: typeof fetch
}

interface SlackEnvelope {
  type: 'url_verification' | 'event_callback' | string
  challenge?: string
  event_id?: string
  event_time?: number
  team_id?: string
  event?: SlackInnerEvent
}

interface SlackInnerEvent {
  type: string
  subtype?: string
  text?: string
  user?: string
  channel?: string
  ts?: string
  thread_ts?: string
  bot_id?: string
  event_ts?: string
  reaction?: string
  item?: { channel?: string; ts?: string }
  files?: Array<{ name: string; mimetype?: string; url_private?: string; size?: number }>
}

function constantTimeEquals(a: string, b: string): boolean {
  // Pad to a common length so an attacker cannot derive signature
  // length from response timing. The expected Slack signature is a
  // fixed-length hex digest (`v0=` + 64 chars), so equal length is
  // the common case — but we hold the line for malformed inputs too.
  const len = Math.max(a.length, b.length)
  const ab = Buffer.alloc(len)
  const bb = Buffer.alloc(len)
  ab.write(a)
  bb.write(b)
  // Pre-verify lengths via timingSafeEqual on length bytes themselves
  // so the result still depends on the original lengths matching.
  const lengthsMatch = a.length === b.length
  const bytesMatch = timingSafeEqual(ab, bb)
  return lengthsMatch && bytesMatch
}

export function slackAdapter(options: SlackAdapterOptions): ChatSurfaceAdapter {
  const fetchImpl = options.fetch ?? fetch
  const maxAge = (options.maxAgeSeconds ?? 300) * 1000

  return {
    surface: 'slack',

    verify: req => {
      const headers = req.headers ?? {}
      const ts = headers['x-slack-request-timestamp']
      const sig = headers['x-slack-signature']
      if (typeof ts !== 'string' || typeof sig !== 'string') return false
      const tsMs = Number(ts) * 1000
      if (!Number.isFinite(tsMs)) return false
      // Reject replays outside the freshness window.
      if (Math.abs(Date.now() - tsMs) > maxAge) return false

      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? '')
      const base = `v0:${ts}:${body}`
      const expected =
        'v0=' + createHmac('sha256', options.signingSecret).update(base).digest('hex')
      return constantTimeEquals(sig, expected)
    },

    parse: req => {
      const envelope = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as SlackEnvelope
      // url_verification handshake → adapter returns null; the trigger
      // returns 200 'ignored', and the integrating server must echo
      // the challenge separately. Templates wire this in src/index.ts.
      if (envelope.type === 'url_verification') return null
      if (envelope.type !== 'event_callback' || !envelope.event) return null

      const inner = envelope.event
      const meta = {
        surface: 'slack' as const,
        eventId: envelope.event_id ?? inner.event_ts ?? inner.ts ?? `${Date.now()}`,
        receivedAt:
          envelope.event_time !== undefined
            ? new Date(envelope.event_time * 1000).toISOString()
            : undefined,
        channel: { id: inner.channel ?? inner.item?.channel ?? '' },
        user: { id: inner.user ?? '', isBot: Boolean(inner.bot_id) },
        threadId: inner.thread_ts,
      }

      if (inner.type === 'app_mention') {
        return { ...meta, type: 'mention', text: inner.text ?? '' }
      }
      if (inner.type === 'message') {
        if (inner.subtype === 'file_share' && inner.files?.[0]) {
          const f = inner.files[0]
          return {
            ...meta,
            type: 'file_upload',
            name: f.name,
            contentType: f.mimetype,
            url: f.url_private,
            sizeBytes: f.size,
          }
        }
        if (inner.thread_ts && inner.thread_ts !== inner.ts) {
          return { ...meta, type: 'reply', text: inner.text ?? '', parentId: inner.thread_ts }
        }
        return { ...meta, type: 'message', text: inner.text ?? '' }
      }
      if (inner.type === 'reaction_added' || inner.type === 'reaction_removed') {
        return {
          ...meta,
          type: 'reaction',
          messageId: inner.item?.ts ?? '',
          emoji: inner.reaction ?? '',
          added: inner.type === 'reaction_added',
        }
      }
      // Surface-specific event we don't normalize — let the trigger 200-ignore.
      return null
    },

    reply: async (event, text) => {
      const channel = event.channel.id
      if (!channel) return
      const thread_ts = 'threadId' in event ? event.threadId : undefined
      await fetchImpl('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${options.botToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ channel, text, thread_ts }),
      })
    },
  }
}

export type { ChatSurfaceEvent }
