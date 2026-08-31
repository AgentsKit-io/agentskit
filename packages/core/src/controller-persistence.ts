import { ErrorCodes, MemoryError } from './errors'
import type { ChatMemory, Message } from './types'

export interface ControllerPersistenceCallbacks {
  onSave: (messageCount: number) => void
  onError: (error: MemoryError) => void
}

/** Keeps the controller's memory boundary independent from stream orchestration. */
export function createControllerPersistence(
  getMemory: () => ChatMemory | undefined,
  callbacks: ControllerPersistenceCallbacks,
) {
  return {
    async save(messages: Message[]): Promise<void> {
      const memory = getMemory()
      if (!memory) return
      try {
        await memory.save(messages)
        callbacks.onSave(messages.length)
      } catch (cause) {
        callbacks.onError(new MemoryError({
          code: ErrorCodes.AK_MEMORY_SAVE_FAILED,
          message: 'Chat memory save failed',
          hint: 'The completed response remains in memory, but durable persistence was not confirmed.',
          cause,
        }))
      }
    },

    async load(): Promise<Message[]> {
      const memory = getMemory()
      if (!memory) return []
      try {
        return await memory.load()
      } catch (cause) {
        if (cause instanceof MemoryError) throw cause
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_LOAD_FAILED,
          message: 'Chat memory load failed',
          hint: 'The chat will continue with in-memory state; fix the durable backend before retrying.',
          cause,
        })
      }
    },

    async clear(): Promise<void> {
      await getMemory()?.clear?.()
    },
  }
}
