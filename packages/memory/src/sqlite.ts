import type {
  ChatMemory,
  Message,
  MemoryRecord,
} from '@agentskit/core'
import {
  ErrorCodes,
  MemoryError,
  deserializeMessages,
  serializeMessages,
} from '@agentskit/core'

type MemoryOperationOptions = Parameters<ChatMemory['load']>[0]

export interface SqliteChatMemoryConfig {
  path: string
  conversationId?: string
}

function encodeMessages(messages: Message[]): string {
  return JSON.stringify(serializeMessages(messages))
}

function decodeMessages(json: string | undefined): Message[] {
  if (!json) return []
  try {
    return deserializeMessages(JSON.parse(json) as MemoryRecord)
  } catch {
    return []
  }
}

interface SqliteDb {
  prepare(sql: string): {
    run(...args: unknown[]): void
    get(...args: unknown[]): Record<string, unknown> | undefined
  }
}

async function openDatabase(path: string): Promise<SqliteDb> {
  try {
    const mod = await import('better-sqlite3')
    const Database = mod.default ?? mod
    return new (Database as new (p: string) => SqliteDb)(path)
  } catch {
    throw new MemoryError({
      code: ErrorCodes.AK_MEMORY_PEER_MISSING,
      message: 'Install better-sqlite3 to use sqliteChatMemory: npm install better-sqlite3',
      hint: 'sqliteChatMemory uses the optional peer "better-sqlite3".',
    })
  }
}

export function sqliteChatMemory(config: SqliteChatMemoryConfig): ChatMemory {
  const conversationId = config.conversationId ?? 'default'
  let dbPromise: Promise<SqliteDb> | null = null

  const getDb = (): Promise<SqliteDb> => {
    if (!dbPromise) {
      dbPromise = openDatabase(config.path).then(db => {
        db.prepare(`
          CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            messages TEXT NOT NULL
          )
        `).run()
        return db
      })
    }
    return dbPromise
  }

  return {
    async load(options?: MemoryOperationOptions) {
      options?.signal?.throwIfAborted()
      const db = await getDb()
      options?.signal?.throwIfAborted()
      const row = db.prepare('SELECT messages FROM conversations WHERE id = ?').get(conversationId)
      return decodeMessages(row?.messages as string | undefined)
    },
    async save(messages, options?: MemoryOperationOptions) {
      options?.signal?.throwIfAborted()
      const db = await getDb()
      options?.signal?.throwIfAborted()
      const json = encodeMessages(messages)
      db.prepare(`
        INSERT INTO conversations (id, messages) VALUES (?, ?)
        ON CONFLICT(id) DO UPDATE SET messages = ?
      `).run(conversationId, json, json)
    },
    async clear(options?: MemoryOperationOptions) {
      options?.signal?.throwIfAborted()
      const db = await getDb()
      options?.signal?.throwIfAborted()
      db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId)
    },
  }
}
