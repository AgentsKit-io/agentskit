import type { ChatMemory } from './types/memory'
import type { Message } from './types/message'
import type { TokenCounter } from './types/token-counter'
import { approximateCounter } from './budget'

/** Token budget, summarizer, and callbacks for automatic memory compaction. */
export interface AutoSummarizeOptions {
  /** Hard cap on stored tokens. Once exceeded, the oldest messages are summarized. */
  maxTokens: number
  /**
   * Called with the messages selected for compaction. Returns a
   * single summary message that replaces them.
   */
  summarizer: (messages: Message[]) => Message | Promise<Message>
  /** Messages to always keep verbatim at the tail. Default 4. */
  keepRecent?: number
  /** Token counter. Defaults to `approximateCounter`. */
  counter?: TokenCounter
  /** Fires after every compaction. */
  onCompact?: (info: {
    droppedCount: number
    beforeTokens: number
    afterTokens: number
    summary: Message
  }) => void
}

interface CompactResult {
  messages: Message[]
  summary?: Message
  droppedCount: number
  beforeTokens: number
  afterTokens: number
}

async function compact(messages: Message[], options: AutoSummarizeOptions): Promise<CompactResult> {
  const counter = options.counter ?? approximateCounter
  const keepRecent = Math.max(1, options.keepRecent ?? 4)
  const toNum = async (v: number | Promise<number>): Promise<number> => (typeof v === 'number' ? v : await v)

  const total = await toNum(counter.count(messages))
  if (total <= options.maxTokens || messages.length <= keepRecent) {
    return { messages, droppedCount: 0, beforeTokens: total, afterTokens: total }
  }

  const tail = messages.slice(messages.length - keepRecent)
  const head = messages.slice(0, messages.length - keepRecent)
  const droppable: Message[] = []
  const keptHead: Message[] = []

  // Drop preserved summaries last; they already represent compacted history.
  for (const m of head) {
    if (m.metadata?.agentskitSummary === true) keptHead.push(m)
    else droppable.push(m)
  }

  if (droppable.length === 0) {
    return { messages, droppedCount: 0, beforeTokens: total, afterTokens: total }
  }

  const summary = await options.summarizer(droppable)
  const withSummary: Message = {
    ...summary,
    metadata: { ...(summary.metadata ?? {}), agentskitSummary: true },
  }

  const next = [...keptHead, withSummary, ...tail]
  const afterTokens = await toNum(counter.count(next))
  return {
    messages: next,
    summary: withSummary,
    droppedCount: droppable.length,
    beforeTokens: total,
    afterTokens,
  }
}

/**
 * Wrap any `ChatMemory` so that on every `save`, messages over
 * `maxTokens` are folded into a single summary message via
 * `summarizer`. Summaries are idempotent: they're tagged with
 * `metadata.agentskitSummary = true` and are never re-summarized.
 *
 * Pair this with a runtime-level `maxTokens` equal to the model's
 * context window minus a reserve for the response, and your agent's
 * history auto-compacts forever.
 */
export function createAutoSummarizingMemory(
  backing: ChatMemory,
  options: AutoSummarizeOptions,
): ChatMemory {
  return {
    async load() {
      return backing.load()
    },
    async save(messages) {
      const result = await compact(messages, options)
      await backing.save(result.messages)
      if (result.summary) {
        options.onCompact?.({
          droppedCount: result.droppedCount,
          beforeTokens: result.beforeTokens,
          afterTokens: result.afterTokens,
          summary: result.summary,
        })
      }
    },
    async clear() {
      await backing.clear?.()
    },
  }
}
