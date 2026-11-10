import { ErrorCodes, MemoryError } from './errors'
import type { ChatMemory, MemoryRecord, Message } from './types'

/** Convert messages into the versioned JSON-safe memory record format.
 * @param messages Messages to serialize.
 * @returns A version 1 record with ISO timestamp strings.
 */
export function serializeMessages(messages: Message[]): MemoryRecord {
  return JSON.parse(JSON.stringify({
    version: 1,
    messages,
  })) as MemoryRecord
}

/** Restore messages from a memory record, including `createdAt` dates.
 * @param record Serialized record, or `null` / `undefined` for no messages.
 * @returns Restored messages; an absent record produces an empty array.
 */
export function deserializeMessages(record: MemoryRecord | null | undefined): Message[] {
  if (!record?.messages) return []
  return record.messages.map(message => ({
    ...message,
    createdAt: new Date(message.createdAt),
  }))
}

/** Create a message-memory backend that stores data in the current process.
 * @param initialMessages Optional messages to seed the store.
 * @returns A `ChatMemory` implementation backed by an in-memory array.
 */
export function createInMemoryMemory(initialMessages: Message[] = []): ChatMemory {
  let messages = [...initialMessages]

  return {
    async load() {
      return [...messages]
    },
    async save(nextMessages) {
      messages = [...nextMessages]
    },
    async clear() {
      messages = []
    },
  }
}

/** Create a browser-local-storage backend using the supplied storage key.
 * @param key Local storage key for the serialized message record.
 * @returns A `ChatMemory` implementation backed by browser local storage.
 * @throws MemoryError from load, save, or clear when storage access fails.
 */
export function createLocalStorageMemory(key: string): ChatMemory {
  return {
    async load() {
      if (typeof localStorage === 'undefined') return []
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return []
        // Lazy: keeps the validator out of the main entry's static import graph (10 KB budget).
        const { validateMemoryRecord } = await import('./memory-validation.js')
        return deserializeMessages(validateMemoryRecord(JSON.parse(raw)))
      } catch (cause) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_LOAD_FAILED,
          message: 'Local storage memory could not be read or contains invalid serialized messages.',
          hint: 'Repair or remove the stored value, or check browser storage permissions.',
          cause,
        })
      }
    },
    async save(messages) {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.setItem(key, JSON.stringify(serializeMessages(messages)))
      } catch (cause) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_SAVE_FAILED,
          message: 'Local storage memory could not be saved.',
          hint: 'Check browser storage permissions and available quota.',
          cause,
        })
      }
    },
    async clear() {
      if (typeof localStorage === 'undefined') return
      try {
        localStorage.removeItem(key)
      } catch (cause) {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_CLEAR_FAILED,
          message: 'Local storage memory could not be cleared.',
          hint: 'Check browser storage permissions.',
          cause,
        })
      }
    },
  }
}
