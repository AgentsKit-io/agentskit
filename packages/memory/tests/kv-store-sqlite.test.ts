import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { createSqliteStore, tryDefaultSqliteOpener, type SqliteLike, type SqliteStmt } from '../src/index'

// Minimal in-memory fake of the better-sqlite3 surface the store uses.
const fakeSqlite = (): SqliteLike => {
  const rows = new Map<string, { value: string; inserted_at: number }>()
  const stmt = (sql: string): SqliteStmt => ({
    run: (...p: unknown[]) => {
      if (sql.startsWith('INSERT')) rows.set(p[0] as string, { value: p[1] as string, inserted_at: p[2] as number })
      else if (sql.startsWith('DELETE')) rows.delete(p[0] as string)
    },
    get: (...p: unknown[]) => {
      if (sql.startsWith('SELECT value')) return rows.get(p[0] as string)
      if (sql.startsWith('SELECT COUNT')) return { n: rows.size }
      if (sql.startsWith('SELECT key')) {
        const first = [...rows.entries()].sort((a, b) => a[1].inserted_at - b[1].inserted_at)[0]
        return first ? { key: first[0] } : undefined
      }
      return undefined
    },
    all: () => [],
  })
  return { exec: () => {}, prepare: stmt }
}

describe('createSqliteStore', () => {
  it('round-trips JSON values', async () => {
    const s = createSqliteStore({ config: { backend: 'sqlite', path: ':memory:' }, open: fakeSqlite })
    await s.set('k', { hi: true })
    expect(await s.get('k')).toEqual({ hi: true })
    expect(await s.get('missing')).toBeUndefined()
  })

  it('evicts oldest beyond maxMessages', async () => {
    const s = createSqliteStore({ config: { backend: 'sqlite', path: ':memory:', maxMessages: 1 }, open: fakeSqlite })
    await s.set('a', 1)
    await s.set('b', 2)
    expect(await s.get('a')).toBeUndefined()
    expect(await s.get('b')).toBe(2)
  })

  it('rolls back eviction failure through the real lazy better-sqlite3 opener and native transaction', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'agentskit-sqlite-atomic-'))
    const path = join(directory, 'memory.sqlite')
    let db: Database.Database | undefined
    try {
      const nativeOpen = await tryDefaultSqliteOpener()
      expect(nativeOpen).toBeDefined()
      const open = (databasePath: string): SqliteLike => {
        db = nativeOpen!(databasePath) as Database.Database
        return db
      }
      expect(typeof open(path).transaction).toBe('function')
      db!.close()
      db = undefined
      const store = createSqliteStore({ config: { backend: 'sqlite', path, maxMessages: 1 }, open })
      await store.set('a', 1)
      db!.exec(`CREATE TRIGGER reject_memory_eviction BEFORE DELETE ON memory
        BEGIN SELECT RAISE(ABORT, 'injected eviction failure'); END;`)

      await expect(store.set('b', 2)).rejects.toThrow('injected eviction failure')
      expect(db!.prepare('SELECT key, value FROM memory ORDER BY key').all()).toEqual([
        { key: 'a', value: '1' },
      ])
      expect(await store.get('a')).toBe(1)
      expect(await store.get('b')).toBeUndefined()
    } finally {
      db?.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
