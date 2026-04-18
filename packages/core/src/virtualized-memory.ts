import type { ChatMemory } from './types/memory'
import type { Message } from './types/message'

export interface VirtualizedMemoryOptions {
  /** Maximum number of recent messages to keep "hot" (always loaded). Default 50. */
  maxActive?: number
  /**
   * Optional retriever used to surface relevant "cold" messages on
   * each `load()`. Given the hot window, returns up to `maxRetrieved`
   * older messages to splice back in (in chronological order).
   */
  retriever?: (input: {
    hot: Message[]
    cold: Message[]
    maxRetrieved: number
  }) => Message[] | Promise<Message[]>
  /** Maximum retrieved cold messages per load. Default 10. */
  maxRetrieved?: number
}

/**
 * Wrap any `ChatMemory` implementation with a fixed active window.
 * Older messages (cold) are preserved on disk / in the backing store
 * but omitted from `load()` unless a `retriever` surfaces them.
 *
 * Key guarantees:
 *  - Backing store always holds the full conversation. No data loss.
 *  - `load()` returns at most `maxActive + maxRetrieved` messages.
 *  - `save()` merges the caller's messages with any cold tail the
 *    caller did not see, so callers that load -> mutate -> save do not
 *    accidentally truncate history.
 */
export function createVirtualizedMemory(
  backing: ChatMemory,
  options: VirtualizedMemoryOptions = {},
): ChatMemory & {
  /** Total messages in the backing store (hot + cold). */
  size: () => Promise<number>
  /** Read the full (cold + hot) message list, bypassing virtualization. */
  loadAll: () => Promise<Message[]>
} {
  const maxActive = Math.max(1, options.maxActive ?? 50)
  const maxRetrieved = Math.max(0, options.maxRetrieved ?? 10)

  const splitHotCold = (msgs: Message[]): { hot: Message[]; cold: Message[] } => {
    if (msgs.length <= maxActive) return { hot: msgs.slice(), cold: [] }
    return { hot: msgs.slice(msgs.length - maxActive), cold: msgs.slice(0, msgs.length - maxActive) }
  }

  return {
    async load() {
      const all = [...(await backing.load())]
      const { hot, cold } = splitHotCold(all)
      if (cold.length === 0) return hot
      let retrieved: Message[] = []
      if (options.retriever && maxRetrieved > 0) {
        retrieved = [...(await options.retriever({ hot, cold, maxRetrieved }))]
      }
      const seen = new Set(hot.map(m => m.id))
      const interleaved = retrieved.filter(m => !seen.has(m.id))
      return mergeByCreatedAt(interleaved, hot)
    },

    async save(visible) {
      const all = [...(await backing.load())]
      const { cold } = splitHotCold(all)
      const visibleIds = new Set(visible.map(m => m.id))
      const coldKept = cold.filter(m => !visibleIds.has(m.id))
      await backing.save(mergeByCreatedAt(coldKept, visible))
    },

    async clear() {
      await backing.clear?.()
    },

    async size() {
      return (await backing.load()).length
    },

    async loadAll() {
      return [...(await backing.load())]
    },
  }
}

function mergeByCreatedAt(a: Message[], b: Message[]): Message[] {
  const out = [...a, ...b]
  out.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  return out
}
