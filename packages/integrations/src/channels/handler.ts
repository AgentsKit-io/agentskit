import type { Channel, InboundMessage } from './types'

/** A raw webhook request as received by the HTTP server. */
export interface ChannelWebhookRequest {
  headers: Record<string, string>
  rawBody: string
  requestUrl?: string
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
  return async (request) => {
    const verified = channel.verify(request)
    if (!verified.ok) return { status: 401, body: verified.reason }
    const messages = channel.receive(request.rawBody)
    for (const message of messages) {
      if (!filter(message)) continue
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
