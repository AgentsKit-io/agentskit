import type { ChatSurfaceAdapter, ChatSurfaceEvent } from '@agentskit/runtime'

/**
 * Reference Microsoft Teams adapter consuming Bot Framework activity
 * payloads. Driver-light: no botbuilder dependency. Verification of
 * the inbound JWT (`Authorization: Bearer …` from the Bot Framework
 * service) is delegated to a `verifyToken` callback so deployers can
 * plug `botbuilder` or `jose` without forcing a heavy default.
 *
 * Reply path expects an injected `serviceClient` that knows how to
 * post to the channel's `serviceUrl` — abstracting auth + signing
 * keeps this adapter free of Azure SDKs.
 */

export interface TeamsAdapterOptions {
  /**
   * Verify the inbound `Authorization: Bearer <jwt>` header. Default:
   * **deny everything** so you cannot forget to plug auth in. Wire
   * to `botbuilder`'s `JwtTokenValidation.authenticateRequest` or any
   * JWT lib in production.
   */
  verifyToken?: (token: string, req: { headers: Record<string, string>; body: unknown }) => Promise<boolean> | boolean
  /** Post a reply to a conversation via the Bot Framework service URL. */
  serviceClient: TeamsServiceClient
}

export interface TeamsServiceClient {
  /** Send a text reply into a conversation. */
  sendMessage: (params: {
    serviceUrl: string
    conversationId: string
    text: string
    replyToId?: string
  }) => Promise<void>
}

interface TeamsActivity {
  /** 'message' | 'conversationUpdate' | 'messageReaction' | 'invoke' | 'typing' | ... */
  type: string
  id?: string
  timestamp?: string
  serviceUrl?: string
  channelId?: string
  conversation?: { id: string; name?: string; isGroup?: boolean; conversationType?: string }
  from?: { id: string; name?: string; aadObjectId?: string }
  recipient?: { id: string; name?: string }
  text?: string
  replyToId?: string
  attachments?: Array<{ name?: string; contentType?: string; contentUrl?: string }>
  reactionsAdded?: Array<{ type: string }>
  reactionsRemoved?: Array<{ type: string }>
  membersAdded?: Array<{ id: string; aadObjectId?: string }>
  membersRemoved?: Array<{ id: string }>
}

function defaultVerifyToken(): false {
  return false
}

export function teamsAdapter(options: TeamsAdapterOptions): ChatSurfaceAdapter {
  const verifyToken = options.verifyToken ?? defaultVerifyToken
  // Bot Framework replies need the inbound activity's `serviceUrl`,
  // but ChatSurfaceEvent has no surface-specific extension slot. Stash
  // it keyed by eventId at parse time, look it up at reply time, evict
  // on use to avoid unbounded growth. Best-effort: events that never
  // get replied to age out after `serviceUrlTtlMs`.
  const serviceUrlByEventId = new Map<string, { url: string; expiresAt: number }>()
  const SERVICE_URL_TTL_MS = 60_000

  function rememberServiceUrl(eventId: string, url: string): void {
    const now = Date.now()
    // Opportunistic eviction.
    for (const [k, v] of serviceUrlByEventId) {
      if (v.expiresAt < now) serviceUrlByEventId.delete(k)
    }
    serviceUrlByEventId.set(eventId, { url, expiresAt: now + SERVICE_URL_TTL_MS })
  }

  function takeServiceUrl(eventId: string): string {
    const entry = serviceUrlByEventId.get(eventId)
    if (!entry) return ''
    serviceUrlByEventId.delete(eventId)
    return entry.url
  }

  return {
    surface: 'teams',

    verify: async req => {
      const headers: Record<string, string> = {}
      for (const [k, v] of Object.entries(req.headers ?? {})) {
        if (typeof v === 'string') headers[k] = v
      }
      const auth = headers['authorization']
      if (typeof auth !== 'string' || !auth.toLowerCase().startsWith('bearer ')) return false
      const token = auth.slice('bearer '.length).trim()
      if (!token) return false
      return await verifyToken(token, { headers, body: req.body })
    },

    parse: req => {
      const activity = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as TeamsActivity
      const eventId = activity.id ?? `${Date.now()}`
      if (activity.serviceUrl) rememberServiceUrl(eventId, activity.serviceUrl)
      const meta = {
        surface: 'teams' as const,
        eventId,
        receivedAt: activity.timestamp,
        channel: {
          id: activity.conversation?.id ?? '',
          name: activity.conversation?.name,
          kind: activity.conversation?.isGroup ? ('group' as const) : ('channel' as const),
        },
        user: { id: activity.from?.id ?? '', name: activity.from?.name },
        threadId: activity.replyToId,
      }

      if (activity.type === 'message') {
        if (activity.attachments?.[0]?.contentUrl) {
          const a = activity.attachments[0]
          return {
            ...meta,
            type: 'file_upload',
            name: a.name ?? 'attachment',
            contentType: a.contentType,
            url: a.contentUrl,
          }
        }
        if (activity.replyToId) {
          return { ...meta, type: 'reply', text: activity.text ?? '', parentId: activity.replyToId }
        }
        // Teams "@mention" still arrives as `type: 'message'`; surface it
        // as `mention` when the text starts with the bot's name. We can't
        // know the bot name at adapter level without configuration, so
        // just treat all messages as `message` and let consumers refine
        // via filter / buildTask if they need explicit mention semantics.
        return { ...meta, type: 'message', text: activity.text ?? '' }
      }
      if (activity.type === 'messageReaction') {
        const reaction = activity.reactionsAdded?.[0] ?? activity.reactionsRemoved?.[0]
        if (!reaction) return null
        return {
          ...meta,
          type: 'reaction',
          messageId: activity.replyToId ?? '',
          emoji: reaction.type,
          added: Boolean(activity.reactionsAdded?.length),
        }
      }
      if (activity.type === 'conversationUpdate') {
        if (activity.membersAdded?.length || activity.membersRemoved?.length) {
          return {
            ...meta,
            type: 'installation',
            action: activity.membersAdded?.length ? 'installed' : 'uninstalled',
            tenantId: activity.from?.aadObjectId ?? activity.conversation?.id ?? '',
          }
        }
        return null
      }
      // typing / invoke / endOfConversation etc. — let the trigger 200-ignore.
      return null
    },

    reply: async (event, text) => {
      const serviceUrl = takeServiceUrl(event.eventId)
      if (!serviceUrl) {
        // No captured serviceUrl — most likely a duplicate reply on
        // the same event, or an event that was never parsed by this
        // adapter instance. Refuse the reply rather than send to the
        // wrong endpoint.
        throw new Error(
          `teamsAdapter.reply: no serviceUrl for eventId ${event.eventId} (already replied or expired after 60s)`,
        )
      }
      await options.serviceClient.sendMessage({
        serviceUrl,
        conversationId: event.channel.id,
        text,
        replyToId: 'threadId' in event ? event.threadId : undefined,
      })
    },
  }
}

export type { ChatSurfaceEvent }
