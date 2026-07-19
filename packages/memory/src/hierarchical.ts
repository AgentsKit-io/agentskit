import type { ChatMemory, Message } from '@agentskit/core'

type MemoryOperationOptions = Parameters<ChatMemory['load']>[0]

export interface HierarchicalRecall {
  /**
   * Index a message for later retrieval. Called once per message as
   * it moves from working → recall (usually: embed + store in a
   * vector DB).
   */
  index: (message: Message) => void | Promise<void>
  /**
   * Given the hot working window, return up to `topK` messages from
   * the recall tier that are relevant to the current turn. The hub
   * splices results chronologically alongside the working window.
   */
  query: (input: { working: Message[]; topK: number }) => Message[] | Promise<Message[]>
}

export interface HierarchicalMemoryOptions {
  /** Hot window — the messages always loaded in full. */
  working: ChatMemory
  /** Cold storage — every message ever seen is written here. */
  archival: ChatMemory
  /**
   * Mid-term recall layer (usually a vector store). Optional;
   * without it the hub behaves like virtualized memory with a hard
   * backing store.
   */
  recall?: HierarchicalRecall
  /**
   * Maximum messages to keep in `working`. Older messages spill
   * into recall + archival. Default 50.
   */
  workingLimit?: number
  /**
   * Max recalled messages to splice on each `load()`. Default 5.
   */
  recallTopK?: number
}

export interface HierarchicalMemory extends ChatMemory {
  /** Full archival history. Always the source of truth. */
  archival: () => Promise<Message[]>
  /** Current working-window snapshot. */
  working: () => Promise<Message[]>
}

function mergeChronological(a: Message[], b: Message[]): Message[] {
  const out = [...a, ...b]
  out.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())
  return out
}

/**
 * MemGPT-style tiered memory. Three tiers:
 *   - working: always-loaded hot window (bounded by `workingLimit`).
 *   - recall: mid-term searchable layer (usually a vector store).
 *   - archival: cold store that always holds the full conversation.
 *
 * On every `save`, new messages are appended to archival, messages
 * that overflow the working window are indexed into recall, and the
 * working tier is trimmed to `workingLimit`.
 *
 * On every `load`, the hub returns working + up to `recallTopK`
 * messages surfaced by the recall tier, spliced chronologically.
 */
export function createHierarchicalMemory(
  options: HierarchicalMemoryOptions,
): HierarchicalMemory {
  const workingLimit = Math.max(1, options.workingLimit ?? 50)
  const recallTopK = Math.max(0, options.recallTopK ?? 5)

  const loadAll = async (
    source: ChatMemory,
    memoryOptions?: MemoryOperationOptions,
  ): Promise<Message[]> => [...(await source.load(memoryOptions))]

  return {
    async load(memoryOptions?: MemoryOperationOptions) {
      memoryOptions?.signal?.throwIfAborted()
      const hot = await loadAll(options.working, memoryOptions)
      if (!options.recall || recallTopK === 0) return hot
      memoryOptions?.signal?.throwIfAborted()
      let recalled: Message[] = []
      try {
        recalled = [...(await options.recall.query({ working: hot, topK: recallTopK }))]
      } catch {
        recalled = []
      }
      memoryOptions?.signal?.throwIfAborted()
      const hotIds = new Set(hot.map(m => m.id))
      return mergeChronological(
        recalled.filter(m => !hotIds.has(m.id)),
        hot,
      )
    },

    async save(messages, memoryOptions?: MemoryOperationOptions) {
      memoryOptions?.signal?.throwIfAborted()
      const knownArchival = await loadAll(options.archival, memoryOptions)
      memoryOptions?.signal?.throwIfAborted()
      const archivalIds = new Set(knownArchival.map(m => m.id))
      const fresh = messages.filter(m => !archivalIds.has(m.id))

      // Archival: append everything, preserving full history.
      if (fresh.length > 0) {
        await options.archival.save(
          mergeChronological(knownArchival, fresh),
          memoryOptions,
        )
      }

      // Working: trim to the tail `workingLimit` of the caller's view.
      const tail = messages.slice(Math.max(0, messages.length - workingLimit))
      const overflow = messages.slice(0, Math.max(0, messages.length - workingLimit))
      memoryOptions?.signal?.throwIfAborted()
      await options.working.save(tail, memoryOptions)

      if (options.recall) {
        memoryOptions?.signal?.throwIfAborted()
        const knownOverflow = overflow.filter(m => fresh.some(f => f.id === m.id))
        for (const m of knownOverflow) {
          memoryOptions?.signal?.throwIfAborted()
          await options.recall.index(m)
        }
        // Also index freshly saved messages that never hit working
        // (e.g. system/tool transcripts).
        const appended = fresh.filter(m => !tail.some(t => t.id === m.id))
        for (const m of appended) {
          memoryOptions?.signal?.throwIfAborted()
          await options.recall.index(m)
        }
      }
    },

    async clear(memoryOptions?: MemoryOperationOptions) {
      memoryOptions?.signal?.throwIfAborted()
      await options.working.clear?.(memoryOptions)
      memoryOptions?.signal?.throwIfAborted()
      await options.archival.clear?.(memoryOptions)
    },

    async archival() {
      return loadAll(options.archival)
    },

    async working() {
      return loadAll(options.working)
    },
  }
}
