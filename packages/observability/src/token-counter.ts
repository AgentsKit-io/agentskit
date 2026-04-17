import type { Message, TokenCounter, TokenCounterOptions, TokenCountResult } from '@agentskit/core'

/**
 * Overhead tokens per message that most chat APIs add for structural framing
 * (role tags, delimiters, etc.). OpenAI documents ~4 tokens per message.
 */
const PER_MESSAGE_OVERHEAD = 4

/**
 * Estimate token count using the chars/4 heuristic.
 *
 * This is a fast, zero-dependency approximation that works reasonably well
 * across English text for all providers. It slightly overestimates, which
 * is preferable when checking budgets.
 */
function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Count tokens for a single message (content + role overhead).
 */
function countSingleMessage(msg: Pick<Message, 'role' | 'content'>): number {
  return approximateTokens(msg.content) + PER_MESSAGE_OVERHEAD
}

/**
 * A fast, zero-dependency approximate token counter.
 *
 * Uses the `chars / 4` heuristic plus a small per-message overhead
 * to account for chat framing tokens.
 *
 * Good enough for budget checks and context-window guards. For exact
 * counts, use a provider-specific counter (e.g. `createTiktokenCounter`).
 *
 * @example
 * ```ts
 * import { approximateCounter } from '@agentskit/observability'
 *
 * const tokens = approximateCounter.count(messages)
 * if (tokens > 120_000) trimOldMessages(messages)
 * ```
 */
export const approximateCounter: TokenCounter = {
  name: 'approximate',

  count(messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>): number {
    let total = 0
    for (const msg of messages) {
      total += countSingleMessage(msg)
    }
    return total
  },

  countDetailed(messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>): TokenCountResult {
    const perMessage: number[] = []
    let total = 0
    for (const msg of messages) {
      const count = countSingleMessage(msg)
      perMessage.push(count)
      total += count
    }
    return { total, perMessage }
  },
}

// ---------------------------------------------------------------------------
// Convenience function
// ---------------------------------------------------------------------------

/**
 * Count (or estimate) tokens for a list of messages.
 *
 * When no custom counter is provided, falls back to the built-in
 * `approximateCounter` (zero deps, chars/4 heuristic).
 *
 * @example
 * ```ts
 * import { countTokens } from '@agentskit/observability'
 *
 * // Quick approximate count
 * const total = await countTokens(messages)
 *
 * // With a custom provider-specific counter
 * const exact = await countTokens(messages, { counter: tiktokenCounter, model: 'gpt-4o' })
 * ```
 */
export async function countTokens(
  messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>,
  options?: TokenCounterOptions & { counter?: TokenCounter },
): Promise<number> {
  const counter = options?.counter ?? approximateCounter
  return counter.count(messages, options)
}

/**
 * Same as `countTokens` but returns per-message breakdown.
 */
export async function countTokensDetailed(
  messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>,
  options?: TokenCounterOptions & { counter?: TokenCounter },
): Promise<TokenCountResult> {
  const counter = options?.counter ?? approximateCounter
  if (counter.countDetailed) {
    return counter.countDetailed(messages, options)
  }
  // Fallback: count each message individually
  const perMessage: number[] = []
  let total = 0
  for (const msg of messages) {
    const count = await counter.count([msg], options)
    perMessage.push(count)
    total += count
  }
  return { total, perMessage }
}

// ---------------------------------------------------------------------------
// Provider-specific counter factory
// ---------------------------------------------------------------------------

/**
 * Options for creating a provider-specific token counter.
 */
export interface ProviderTokenCounterOptions {
  /**
   * The tokenize function from a provider-specific tokenizer library.
   * Must return an array of token ids (or any array whose `.length`
   * represents the token count).
   *
   * @example
   * ```ts
   * import { encoding_for_model } from 'tiktoken'
   * const enc = encoding_for_model('gpt-4o')
   * const counter = createProviderCounter({
   *   name: 'tiktoken',
   *   tokenize: (text) => [...enc.encode(text)],
   * })
   * ```
   */
  tokenize: (text: string, model?: string) => ReadonlyArray<unknown> | Promise<ReadonlyArray<unknown>>
  /** Human-readable name for this counter. */
  name: string
  /** Per-message overhead in tokens. Defaults to 4. */
  perMessageOverhead?: number
}

/**
 * Create a token counter backed by a real tokenizer.
 *
 * This factory lets you plug in any tokenizer library (tiktoken, Anthropic's
 * tokenizer, etc.) while conforming to the `TokenCounter` contract.
 *
 * @example
 * ```ts
 * import { createProviderCounter } from '@agentskit/observability'
 * import { encoding_for_model } from 'tiktoken'
 *
 * const enc = encoding_for_model('gpt-4o')
 * const tiktokenCounter = createProviderCounter({
 *   name: 'tiktoken',
 *   tokenize: (text) => [...enc.encode(text)],
 * })
 *
 * const tokens = await countTokens(messages, { counter: tiktokenCounter })
 * ```
 */
export function createProviderCounter(options: ProviderTokenCounterOptions): TokenCounter {
  const { tokenize, name, perMessageOverhead = PER_MESSAGE_OVERHEAD } = options

  return {
    name,

    async count(messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>, counterOptions?: TokenCounterOptions): Promise<number> {
      let total = 0
      for (const msg of messages) {
        const tokens = await tokenize(msg.content, counterOptions?.model)
        total += tokens.length + perMessageOverhead
      }
      return total
    },

    async countDetailed(messages: ReadonlyArray<Pick<Message, 'role' | 'content'>>, counterOptions?: TokenCounterOptions): Promise<TokenCountResult> {
      const perMessage: number[] = []
      let total = 0
      for (const msg of messages) {
        const tokens = await tokenize(msg.content, counterOptions?.model)
        const count = tokens.length + perMessageOverhead
        perMessage.push(count)
        total += count
      }
      return { total, perMessage }
    },
  }
}
