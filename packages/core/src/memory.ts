import { ErrorCodes, MemoryError } from './errors'
import type { ChatMemory, MemoryRecord, Message } from './types'

export function serializeMessages(messages: Message[]): MemoryRecord {
  return JSON.parse(JSON.stringify({
    version: 1,
    messages,
  })) as MemoryRecord
}

export function deserializeMessages(record: MemoryRecord | null | undefined): Message[] {
  if (!record?.messages) return []
  return record.messages.map(message => ({
    ...message,
    createdAt: new Date(message.createdAt),
  }))
}

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

export function createLocalStorageMemory(key: string): ChatMemory {
  return {
    async load() {
      if (typeof localStorage === 'undefined') return []
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return []
        return deserializeMessages(JSON.parse(raw) as MemoryRecord)
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
