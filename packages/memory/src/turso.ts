import type { ChatMemory, Message, MemoryRecord } from '@agentskit/core'
import {
  ErrorCodes,
  MemoryError,
  deserializeMessages,
  serializeMessages,
} from '@agentskit/core'

export interface TursoChatMemoryConfig {
  /** libSQL URL — file:..., libsql://..., or http://... */
  url: string
  /** Auth token — required for hosted (libsql://) URLs. */
  authToken?: string
  conversationId?: string
}

interface LibsqlClient {
  execute(args: { sql: string; args?: unknown[] }): Promise<{ rows: Array<Record<string, unknown>> }>
}

interface LibsqlModule {
  createClient(config: { url: string; authToken?: string }): LibsqlClient
}

let cachedSdk: Promise<LibsqlModule> | null = null
async function loadSdk(): Promise<LibsqlModule> {
  if (!cachedSdk) {
    cachedSdk = (async () => {
      try {
        const moduleId = '@libsql/client'
        return (await import(/* @vite-ignore */ moduleId)) as unknown as LibsqlModule
      } catch {
        throw new MemoryError({
          code: ErrorCodes.AK_MEMORY_PEER_MISSING,
          message: 'Install @libsql/client to use tursoChatMemory: npm install @libsql/client',
          hint: 'tursoChatMemory uses the optional peer "@libsql/client".',
        })
      }
    })()
  }
  return cachedSdk
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

/**
 * libSQL / Turso-backed chat memory. Mirrors the `sqliteChatMemory` shape so
 * code paths can swap between local SQLite and replicated libSQL by changing
 * one import.
 *
 * `@libsql/client` is an optional peer dependency loaded lazily.
 */
export function tursoChatMemory(config: TursoChatMemoryConfig): ChatMemory {
  const conversationId = config.conversationId ?? 'default'
  let clientPromise: Promise<LibsqlClient> | null = null

  const getClient = async (): Promise<LibsqlClient> => {
    if (!clientPromise) {
      clientPromise = (async () => {
        const sdk = await loadSdk()
        const client = sdk.createClient({ url: config.url, authToken: config.authToken })
        await client.execute({
          sql: 'CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, messages TEXT NOT NULL)',
        })
        return client
      })()
    }
    return clientPromise
  }

  return {
    async load() {
      const client = await getClient()
      const result = await client.execute({
        sql: 'SELECT messages FROM conversations WHERE id = ?',
        args: [conversationId],
      })
      const row = result.rows[0]
      return decodeMessages(row?.messages as string | undefined)
    },
    async save(messages) {
      const client = await getClient()
      const json = encodeMessages(messages)
      await client.execute({
        sql: `INSERT INTO conversations (id, messages) VALUES (?, ?)
              ON CONFLICT(id) DO UPDATE SET messages = excluded.messages`,
        args: [conversationId, json],
      })
    },
    async clear() {
      const client = await getClient()
      await client.execute({
        sql: 'DELETE FROM conversations WHERE id = ?',
        args: [conversationId],
      })
    },
  }
}
