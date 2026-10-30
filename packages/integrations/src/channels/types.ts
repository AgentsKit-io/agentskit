import type { VerifyResult, WebhookInput } from '../contract'

/** Who sent an inbound message. */
export interface ChannelSender {
  /** Channel-native id (phone number, chat id, Slack user id, email address). */
  id: string
  name?: string
  isBot?: boolean
}

/** A file attached to an inbound or outbound message. */
export interface ChannelAttachment {
  name?: string
  contentType?: string
  /** Download URL, when the channel exposes one directly. */
  url?: string
  /** Channel-native media id, when a separate fetch is needed (WhatsApp, Telegram). */
  id?: string
  sizeBytes?: number
}

/** A message that entered through a channel. */
export interface InboundMessage {
  channel: string
  id: string
  from: ChannelSender
  /** Conversation to answer into (chat id, Slack channel, phone number, sender email). */
  conversationId: string
  threadId?: string
  text: string
  attachments: ChannelAttachment[]
  receivedAt?: string
  raw: unknown
}

/** A reply leaving through a channel. */
export interface OutboundMessage {
  conversationId: string
  text: string
  threadId?: string
  attachments?: ChannelAttachment[]
  /** Email only: subject line. */
  subject?: string
}

/** One conversation channel: verify + parse inbound webhooks, send replies. */
export interface Channel {
  name: string
  /** Verify the webhook signature against the raw body. */
  verify(input: Omit<WebhookInput, 'secret'>): VerifyResult
  /** Parse a raw webhook body into zero or more messages (status callbacks yield none). May be async when the body must be fetched (email). */
  receive(rawBody: string): InboundMessage[] | Promise<InboundMessage[]>
  send(message: OutboundMessage): Promise<void>
  /** After verification, answer provider handshakes that carry no message (Slack `url_verification`). Returns the response body, or undefined when the body is not a handshake. */
  challenge?(rawBody: string): string | undefined
  /** Answer a provider's GET subscription check (WhatsApp `hub.challenge`). */
  handshake?(query: Record<string, string>): { status: number; body: string }
}

/** Options shared by every channel adapter. */
export interface ChannelOptionsBase {
  /** Swap in a fake for tests. */
  fetch?: typeof globalThis.fetch
  /** Override for replay-window checks. */
  nowSeconds?: () => number
}
