import type { Message } from './message'
import type { StreamSource } from './stream'
import type { ToolDefinition } from './tool'
import type { AgentEventContext } from './agent'

export interface AdapterContext {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  metadata?: Record<string, unknown>
}

export interface AdapterRequest {
  messages: Message[]
  context?: AdapterContext
  /** Optional identity propagated to adapters without coupling them to a runtime. */
  correlation?: AgentEventContext
}

/**
 * Hints about what an adapter supports. Every field is optional; an
 * adapter may omit the whole `capabilities` object, and consumers
 * should treat omission as 'unknown — assume the feature works and
 * handle errors if it doesn't'.
 *
 * This is an additive extension to the Adapter contract (ADR 0001) —
 * adapters without capabilities remain fully compliant. Consumers
 * that care (router / ensemble adapters, UI that hides the tool
 * toggle when the provider can't use tools) can read the hints.
 */
export interface AdapterCapabilities {
  /** Does the adapter stream responses natively? */
  streaming?: boolean
  /** Does it support tool calling (function calling)? */
  tools?: boolean
  /** Does it emit a separate reasoning/thinking stream (o1/o3 style)? */
  reasoning?: boolean
  /** Accepts image inputs in the message list? */
  multiModal?: boolean
  /** Supports confirmations / structured-output primitives? */
  structuredOutput?: boolean
  /** Emits token/usage data in chunk metadata? */
  usage?: boolean
  /** Anything else — e.g. provider-specific hints. */
  extensions?: Record<string, unknown>
}

export type AdapterFactory = {
  createSource: (request: AdapterRequest) => StreamSource
  /** Optional capabilities hint. See AdapterCapabilities. */
  capabilities?: AdapterCapabilities
}
