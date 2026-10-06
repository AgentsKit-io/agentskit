import type { ChatMemory, MemoryRecord } from '@agentskit/core'
import { serializeMessages } from '@agentskit/core'
import { validateMemoryRecord } from '@agentskit/core/memory-validation'
import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core'
import { decodeStoredMessages } from './decode'

/** Drizzle schema with one versioned record per tenant/session primary key. */
export const postgresChatTable = pgTable('agentskit_chat_memory', {
  tenantId: text('tenant_id').notNull(),
  sessionId: text('session_id').notNull(),
  record: jsonb('record').$type<MemoryRecord>().notNull(),
}, table => [primaryKey({ columns: [table.tenantId, table.sessionId] })])

/** Idempotent PostgreSQL DDL; execute with the host's migration connection before use. */
export const postgresChatMigrationSql = `CREATE TABLE IF NOT EXISTS agentskit_chat_memory (
  tenant_id text NOT NULL,
  session_id text NOT NULL,
  record jsonb NOT NULL,
  PRIMARY KEY (tenant_id, session_id)
);`

/** Host-owned Drizzle connection, isolation keys, and optional history retention. */
export interface PostgresChatMemoryOptions {
  db: Pick<NodePgDatabase, 'select' | 'insert' | 'delete'>
  tenantId: string
  sessionId: string
  /** Opt-in retention: keep the newest N messages on save. Default: no truncation. */
  maxMessages?: number
}

/** BYO Drizzle/pg connection; the caller owns migration and connection lifetime. */
export function postgresChatMemory({ db, tenantId, sessionId, maxMessages }: PostgresChatMemoryOptions): ChatMemory {
  if (typeof tenantId !== 'string' || !tenantId.trim()
    || typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new TypeError('tenantId and sessionId must be non-empty strings')
  }
  if (maxMessages !== undefined && (!Number.isSafeInteger(maxMessages) || maxMessages < 1)) {
    throw new RangeError('maxMessages must be a positive safe integer')
  }
  const key = and(eq(postgresChatTable.tenantId, tenantId), eq(postgresChatTable.sessionId, sessionId))
  return {
    async load(options) {
      options?.signal?.throwIfAborted()
      const [row] = await db.select({ record: postgresChatTable.record }).from(postgresChatTable).where(key)
      options?.signal?.throwIfAborted()
      return row ? decodeStoredMessages(JSON.stringify(row.record), 'postgresChatMemory') : []
    },
    async save(messages, options) {
      options?.signal?.throwIfAborted()
      const record = validateMemoryRecord(serializeMessages(messages))
      if (maxMessages !== undefined) record.messages = record.messages.slice(-maxMessages)
      options?.signal?.throwIfAborted()
      await db.insert(postgresChatTable).values({ tenantId, sessionId, record })
        .onConflictDoUpdate({ target: [postgresChatTable.tenantId, postgresChatTable.sessionId], set: { record } })
    },
    async clear(options) {
      options?.signal?.throwIfAborted()
      await db.delete(postgresChatTable).where(key)
    },
  }
}
