// sqlite KV backend (injected opener; lazy default via better-sqlite3).

import {
  isExpired,
  type AgentskitMemoryStore,
  type SqliteKvConfig,
  type SqliteLike,
  type SqliteOpener,
} from './kv-store-types'

export interface CreateSqliteStoreOpts {
  readonly config: SqliteKvConfig
  readonly open: SqliteOpener
}

export const createSqliteStore = ({ config, open }: CreateSqliteStoreOpts): AgentskitMemoryStore => {
  const db = open(config.path)
  db.exec(
    `CREATE TABLE IF NOT EXISTS memory (
       key TEXT PRIMARY KEY,
       value TEXT NOT NULL,
       inserted_at INTEGER NOT NULL
     )`,
  )

  const getStmt = db.prepare('SELECT value, inserted_at FROM memory WHERE key = ?')
  const setStmt = db.prepare(
    'INSERT INTO memory(key, value, inserted_at) VALUES(?, ?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value=excluded.value, inserted_at=excluded.inserted_at',
  )
  const delStmt = db.prepare('DELETE FROM memory WHERE key = ?')
  const oldestStmt = db.prepare('SELECT key FROM memory ORDER BY inserted_at ASC LIMIT 1')
  const countStmt = db.prepare('SELECT COUNT(*) as n FROM memory')

  const enforce = (): void => {
    if (config.maxMessages === undefined) return
    const countResult = countStmt.get() as { n: number } | undefined
    let count = countResult ? countResult.n : 0
    while (count > config.maxMessages) {
      const oldest = oldestStmt.get() as { key: string } | undefined
      if (!oldest) break
      delStmt.run(oldest.key)
      count -= 1
    }
  }

  return {
    id: `sqlite:${config.path}`,
    async get(key) {
      const row = getStmt.get(key) as { value: string; inserted_at: number } | undefined
      if (!row) return undefined
      if (isExpired({ value: '', insertedAt: row.inserted_at }, config.ttlSeconds, Date.now())) {
        delStmt.run(key)
        return undefined
      }
      return JSON.parse(row.value) as unknown
    },
    async set(key, value) {
      setStmt.run(key, JSON.stringify(value), Date.now())
      enforce()
    },
  }
}

/**
 * Lazy-import `better-sqlite3` and return an opener, or `undefined` when the
 * optional peer dep is absent (caller surfaces AK_MEMORY_PEER_MISSING).
 */
export const tryDefaultSqliteOpener = async (): Promise<SqliteOpener | undefined> => {
  try {
    const moduleId = 'better-sqlite3'
    const mod = (await import(/* @vite-ignore */ moduleId)) as unknown as {
      readonly default?: new (path: string) => SqliteLike
    }
    const Ctor = mod.default
    if (typeof Ctor !== 'function') return undefined
    return (path: string) => new Ctor(path)
  } catch {
    return undefined
  }
}
