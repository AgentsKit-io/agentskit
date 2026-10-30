import type { Channel, InboundMessage } from './types'

/** A raw webhook request as received by the HTTP server. */
export interface ChannelWebhookRequest {
  headers: Record<string, string>
  rawBody: string
  requestUrl?: string
  /** HTTP method; GET requests are routed to the channel handshake. */
  method?: string
  /** Parsed query string, used for GET handshakes. */
  query?: Record<string, string>
}

/** HTTP answer to hand back to the provider. */
export interface ChannelWebhookResponse {
  status: number
  body: string
}

/** Anything that turns an inbound text into a reply (e.g. an AgentsKit runtime). */
export interface ChannelAgent {
  run(text: string, message: InboundMessage): Promise<string>
}

/** Options for {@link createChannelHandler}. */
export interface ChannelHandlerOptions {
  /** Return false to skip a message. Defaults to skipping messages from bots. */
  filter?: (message: InboundMessage) => boolean
  /** Receives errors from the agent or from sending; the webhook still answers 200 so the provider does not retry-storm. */
  /** Skip messages whose id was already handled (provider retries). Bounded in memory; pass false to disable or a custom check. Default: last 1000 ids. */
  dedupe?: false | ((message: InboundMessage) => boolean)
  onError?: (error: unknown, message: InboundMessage) => void
}

/**
 * Connect a channel to an agent: verify the signature (401 on failure),
 * parse messages, run the agent on each, and send its answer back.
 */
export function createChannelHandler(
  channel: Channel,
  agent: ChannelAgent,
  options: ChannelHandlerOptions = {},
): (request: ChannelWebhookRequest) => Promise<ChannelWebhookResponse> {
  const filter = options.filter ?? ((m: InboundMessage) => !m.from.isBot)
  const seen = new Set<string>()
  const isDuplicate =
    options.dedupe === false ? () => false
    : options.dedupe ?? ((m: InboundMessage) => {
      if (!m.id) return false
      const key = `${m.channel}:${m.id}`
      if (seen.has(key)) return true
      seen.add(key)
      if (seen.size > 1000) seen.delete(seen.values().next().value as string)
      return false
    })
  return async (request) => {
    if (request.method === 'GET') {
      return channel.handshake ? channel.handshake(request.query ?? {}) : { status: 404, body: 'not found' }
    }
    const verified = channel.verify(request)
    if (!verified.ok) return { status: 401, body: verified.reason }
    const challenge = channel.challenge?.(request.rawBody)
    if (challenge !== undefined) return { status: 200, body: challenge }
    // Slack re-delivers after 3s without an ack; the first delivery is already being handled.
    if (request.headers['x-slack-retry-num'] !== undefined) return { status: 200, body: 'ok' }
    const messages = channel.receive(request.rawBody)
    for (const message of messages) {
      if (!filter(message) || isDuplicate(message)) continue
      try {
        const text = await agent.run(message.text, message)
        await channel.send({ conversationId: message.conversationId, threadId: message.threadId, text })
      } catch (error) {
        options.onError?.(error, message)
      }
    }
    return { status: 200, body: 'ok' }
  }
}
