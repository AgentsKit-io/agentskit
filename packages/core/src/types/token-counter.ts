import type { Message } from './message'

/**
 * Options passed to a token counter implementation.
 */
export interface TokenCounterOptions {
  /** Model identifier — used by provider-specific counters to pick the right tokenizer. */
  model?: string
}

/**
 * Result returned by a token counter.
 */
export interface TokenCountResult {
  /** Total token count across all input messages. */
  total: number
  /** Per-message breakdown (same order as input). */
  perMessage?: number[]
}

/**
 * Universal token counter contract.
 *
 * Implementations range from zero-dep approximate counters (chars/4) to
 * provider-specific tokenizers (e.g. tiktoken for OpenAI models).
 *
 * @example
 * ```ts
 * const result = await counter.count(messages, { model: 'gpt-4o' })
 * console.log(`Estimated tokens: ${result.total}`)
 * ```
 */
export interface TokenCounter {
  /** Human-readable name of the counter (e.g. "approximate", "tiktoken"). */
  readonly name: string

  /**
   * Count (or estimate) the number of tokens for a list of messages.
   * May be async to allow lazy-loading of tokenizer WASM modules.
   */
  count(messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>, options?: TokenCounterOptions): number | Promise<number>

  /**
   * Count with per-message breakdown.
   * Falls back to calling `count` once when not overridden.
   */
  countDetailed?(messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>, options?: TokenCounterOptions): TokenCountResult | Promise<TokenCountResult>
}
