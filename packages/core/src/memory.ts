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
      const raw = localStorage.getItem(key)
      if (!raw) return []
      try {
        return deserializeMessages(JSON.parse(raw) as MemoryRecord)
      } catch {
        return []
      }
    },
    async save(messages) {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(key, JSON.stringify(serializeMessages(messages)))
    },
    async clear() {
      if (typeof localStorage === 'undefined') return
      localStorage.removeItem(key)
    },
  }
}
