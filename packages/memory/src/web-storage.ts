import { deserializeMessages, ErrorCodes, MemoryError, serializeMessages } from '@agentskit/core'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import type { ChatMemory, Message } from '@agentskit/core'

export interface WebStorageLike {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

export interface WebStorageMemoryMigration {
  readonly keys: readonly string[]
  readonly read: (value: unknown, key: string) => readonly Message[] | undefined
}

export interface WebStorageMemoryOptions {
  readonly key: string
  readonly getStorage: () => WebStorageLike | undefined
  readonly maxMessages?: number
  readonly maxRecordBytes?: number
  readonly migration?: WebStorageMemoryMigration
}

const positiveInteger = (value: number, name: string): number => {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive safe integer.`)
  return value
}

const withinByteLimit = (value: string, limit: number): boolean =>
  value.length <= limit && new TextEncoder().encode(value).byteLength <= limit

const parseCanonical = (raw: string, maxRecordBytes: number): Message[] | undefined => {
  if (!withinByteLimit(raw, maxRecordBytes)) return undefined
  try {
    return deserializeMessages(validateMemoryRecord(JSON.parse(raw) as unknown))
  } catch {
    return undefined
  }
}

const validateMigrated = (messages: readonly Message[]): Message[] | undefined => {
  try {
    return deserializeMessages(validateMemoryRecord(serializeMessages([...messages])))
  } catch {
    return undefined
  }
}

const encodeRecord = (messages: readonly Message[], maxRecordBytes: number): string => {
  let encoded: string
  try {
    encoded = JSON.stringify(validateMemoryRecord(serializeMessages([...messages])))
  } catch (cause) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_SAVE_FAILED,
      message: 'Web Storage message record is invalid.',
      hint: 'Save only canonical AgentsKit messages.',
      cause,
    })
  }
  if (!withinByteLimit(encoded, maxRecordBytes)) {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_SAVE_FAILED,
      message: 'Web Storage message record exceeds the configured byte limit.',
      hint: 'Reduce message history or increase maxRecordBytes before saving.',
    })
  }
  return encoded
}

/**
 * Creates a validated, bounded ChatMemory over an injected browser Web Storage backend.
 * The storage getter is evaluated lazily so browser globals can remain SSR-safe.
 */
export function createWebStorageMemory({
  key,
  getStorage,
  maxMessages = 20,
  maxRecordBytes = 1_048_576,
  migration,
}: WebStorageMemoryOptions): ChatMemory {
  if (key.length === 0) throw new TypeError('key must not be empty.')
  const retained = positiveInteger(maxMessages, 'maxMessages')
  const byteLimit = positiveInteger(maxRecordBytes, 'maxRecordBytes')

  return {
    async load(options) {
      options?.signal?.throwIfAborted()
      const storage = getStorage()
      if (!storage) return []
      for (const candidateKey of [key, ...(migration?.keys ?? [])]) {
        options?.signal?.throwIfAborted()
        const raw = storage.getItem(candidateKey)
        if (raw === null) continue
        const canonical = candidateKey === key ? parseCanonical(raw, byteLimit) : undefined
        let messages = canonical
        if (messages === undefined && candidateKey !== key && withinByteLimit(raw, byteLimit) && migration) {
          try {
            const migrated = migration.read(JSON.parse(raw) as unknown, candidateKey)
            messages = migrated === undefined ? undefined : validateMigrated(migrated)
          } catch {
            messages = undefined
          }
        }
        if (messages === undefined) {
          try { storage.removeItem(candidateKey) } catch { /* best-effort invalid-record cleanup */ }
          continue
        }
        const bounded = messages.slice(-retained)
        if (candidateKey !== key) {
          const encoded = encodeRecord(bounded, byteLimit)
          try {
            storage.setItem(key, encoded)
            storage.removeItem(candidateKey)
          } catch {
            // Valid legacy data remains readable when storage is read-only or full.
          }
        }
        return bounded
      }
      return []
    },
    async save(messages, options) {
      options?.signal?.throwIfAborted()
      const storage = getStorage()
      if (!storage) return
      const encoded = encodeRecord(messages.slice(-retained), byteLimit)
      storage.setItem(key, encoded)
    },
    async clear(options) {
      options?.signal?.throwIfAborted()
      const storage = getStorage()
      if (!storage) return
      for (const candidateKey of [key, ...(migration?.keys ?? [])]) storage.removeItem(candidateKey)
    },
  }
}
