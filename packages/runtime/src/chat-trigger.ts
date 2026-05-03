/**
 * Unified chat-surface trigger contract — same agent listens on
 * Slack, Teams, Discord, WhatsApp, etc. Adapters parse raw provider
 * events into a normalized `ChatSurfaceEvent`; the trigger wires the
 * event into a runtime-bound agent and returns a framework-agnostic
 * webhook response.
 *
 * Why a single contract: writing three divergent bot templates means
 * three divergent test suites, three observability pipes, three places
 * to enforce HITL. One contract → one set of tests, one observer hook,
 * one HITL surface across every chat surface.
 *
 * Closes #782. Reference adapters wrapping Bolt (Slack), discord.js,
 * and Bot Framework (Teams) ship in `@agentskit/triggers` (AgentsKitOS)
 * and the per-surface bot templates (#779, #780, #781).
 */

import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { AgentHandle } from './topologies'
import type { WebhookHandler, WebhookRequest, WebhookResponse } from './background'

export type ChatSurface = 'slack' | 'teams' | 'discord' | 'whatsapp' | (string & {})

/** Stable identity of a sender across surfaces. */
export interface ChatSurfaceUser {
  id: string
  /** Display name when available. */
  name?: string
  /** True when the sender is a bot (including this agent). */
  isBot?: boolean
}

/** Channel / room / DM identifier. */
export interface ChatSurfaceChannel {
  id: string
  /** Optional human-readable channel name. */
  name?: string
  /** Whether the channel is a 1:1 DM, group DM, or shared channel. */
  kind?: 'dm' | 'group' | 'channel' | 'thread'
}

/** Common metadata every event carries. */
export interface ChatSurfaceMeta {
  surface: ChatSurface
  channel: ChatSurfaceChannel
  user: ChatSurfaceUser
  /** Surface-native event id (Slack `event_id`, Discord interaction id, etc.). */
  eventId: string
  /** Thread / parent message id when the event is in-thread. */
  threadId?: string
  /** ISO 8601 timestamp from the surface, when available. */
  receivedAt?: string
}

/** A plain text message addressed to nobody in particular. */
export interface ChatMessageEvent extends ChatSurfaceMeta {
  type: 'message'
  text: string
}

/** A direct mention of the bot or a slash command. */
export interface ChatMentionEvent extends ChatSurfaceMeta {
  type: 'mention'
  text: string
  /** Slash command name without leading '/' (when applicable). */
  command?: string
}

/** Reply inside an existing thread. */
export interface ChatReplyEvent extends ChatSurfaceMeta {
  type: 'reply'
  text: string
  /** Required: parent message id being replied to. */
  parentId: string
}

/** Emoji reaction added or removed on a message. */
export interface ChatReactionEvent extends ChatSurfaceMeta {
  type: 'reaction'
  /** Reacted-to message id. */
  messageId: string
  /** Emoji shortcode, e.g. `thumbsup`. */
  emoji: string
  /** True when the reaction was added; false when removed. */
  added: boolean
}

/** File / attachment upload. */
export interface ChatFileUploadEvent extends ChatSurfaceMeta {
  type: 'file_upload'
  /** File name as supplied by the surface. */
  name: string
  /** MIME type when known. */
  contentType?: string
  /** URL the surface exposes for download (may require surface auth). */
  url?: string
  /** Size in bytes when reported. */
  sizeBytes?: number
}

/** App installed in a workspace / guild / tenant. */
export interface ChatInstallationEvent extends ChatSurfaceMeta {
  type: 'installation'
  /** Install / uninstall action. */
  action: 'installed' | 'uninstalled'
  /** Tenant / workspace / guild id. */
  tenantId: string
}

export type ChatSurfaceEvent =
  | ChatMessageEvent
  | ChatMentionEvent
  | ChatReplyEvent
  | ChatReactionEvent
  | ChatFileUploadEvent
  | ChatInstallationEvent

export type ChatSurfaceEventType = ChatSurfaceEvent['type']

/**
 * Surface adapter contract. An adapter wraps a provider SDK (Bolt,
 * discord.js, Bot Framework) and turns raw inbound events into the
 * normalized `ChatSurfaceEvent`. Returning `null` from `parse` is a
 * deliberate skip — the trigger emits a `'skipped'` observer event
 * and returns a 200 so the surface stops retrying.
 */
export interface ChatSurfaceAdapter {
  surface: ChatSurface
  /** Parse an inbound webhook into a normalized event. Return `null` to ignore. */
  parse: (req: WebhookRequest) => Promise<ChatSurfaceEvent | null> | ChatSurfaceEvent | null
  /** Verify the request signature. Return `false` to reject with 401. */
  verify?: (req: WebhookRequest) => Promise<boolean> | boolean
  /** Optional reply hook — used when the agent's output should post back. */
  reply?: (event: ChatSurfaceEvent, text: string) => Promise<void> | void
}

export interface ChatTriggerObserverEvent {
  type: 'received' | 'skipped' | 'handled' | 'rejected' | 'replied'
  surface: ChatSurface
  event?: ChatSurfaceEvent
  /** Error or skip reason. */
  reason?: string
}

export interface ChatTriggerOptions<TContext = unknown> {
  adapter: ChatSurfaceAdapter
  agent: AgentHandle<TContext>
  /**
   * Build the agent task from the parsed event. Default: pull
   * `event.text` for message / mention / reply, fall back to a
   * structured JSON encoding for events without text (reaction, file).
   */
  buildTask?: (event: ChatSurfaceEvent) => string
  /**
   * Build the per-event runtime context (e.g. tenant id, user id).
   * Default: `{ event }`.
   */
  buildContext?: (event: ChatSurfaceEvent) => TContext
  /**
   * Filter events before running the agent. Return `false` to skip.
   * Useful for ignoring bot-on-bot loops or off-hours messages.
   */
  filter?: (event: ChatSurfaceEvent) => boolean
  /** Auto-reply with the agent's output via `adapter.reply` when present. */
  autoReply?: boolean
  /** Observability hook. */
  onEvent?: (event: ChatTriggerObserverEvent) => void
}

function defaultBuildTask(event: ChatSurfaceEvent): string {
  if (event.type === 'message' || event.type === 'mention' || event.type === 'reply') {
    return event.text
  }
  return JSON.stringify(event)
}

function defaultBuildContext<TContext>(event: ChatSurfaceEvent): TContext {
  return { event } as unknown as TContext
}

export interface ChatTrigger {
  handler: WebhookHandler
  surface: ChatSurface
}

/**
 * Build a unified chat-surface trigger. Wire the returned `handler`
 * into your HTTP framework (Express / Hono / Next route handler) at
 * the surface's webhook URL.
 */
export function createChatTrigger<TContext = unknown>(
  options: ChatTriggerOptions<TContext>,
): ChatTrigger {
  if (!options.adapter) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createChatTrigger: adapter is required',
      hint: 'Pass a ChatSurfaceAdapter (e.g. wrap Bolt, discord.js, or Bot Framework).',
    })
  }
  if (!options.agent) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createChatTrigger: agent is required',
    })
  }

  const buildTask = options.buildTask ?? defaultBuildTask
  const buildContext = options.buildContext ?? defaultBuildContext<TContext>
  const surface = options.adapter.surface

  const handler: WebhookHandler = async req => {
    options.onEvent?.({ type: 'received', surface })

    if (options.adapter.verify) {
      const ok = await options.adapter.verify(req)
      if (!ok) {
        options.onEvent?.({ type: 'rejected', surface, reason: 'verify returned false' })
        return { status: 401, body: 'unauthorized' }
      }
    }

    let event: ChatSurfaceEvent | null
    try {
      event = await options.adapter.parse(req)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      options.onEvent?.({ type: 'rejected', surface, reason: `parse error: ${message}` })
      return { status: 400, body: message }
    }

    if (event === null) {
      options.onEvent?.({ type: 'skipped', surface, reason: 'adapter returned null' })
      return { status: 200, body: 'ignored' }
    }

    if (options.filter && !options.filter(event)) {
      options.onEvent?.({ type: 'skipped', surface, event, reason: 'filter rejected' })
      return { status: 200, body: 'filtered' }
    }

    try {
      const result = await options.agent.run(buildTask(event), buildContext(event))
      options.onEvent?.({ type: 'handled', surface, event })

      if (options.autoReply && options.adapter.reply) {
        try {
          await options.adapter.reply(event, result)
          options.onEvent?.({ type: 'replied', surface, event })
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          options.onEvent?.({ type: 'rejected', surface, event, reason: `reply error: ${message}` })
          // 200 still — the agent ran, only the post-reply failed.
        }
      }

      return { status: 200, body: result, headers: { 'content-type': 'text/plain; charset=utf-8' } }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      options.onEvent?.({ type: 'rejected', surface, event, reason: message })
      return { status: 500, body: message }
    }
  }

  return { handler, surface }
}
