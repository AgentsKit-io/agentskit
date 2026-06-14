import { describe, expect, it } from 'vitest'
import { createSqliteStore, type SqliteLike, type SqliteStmt } from '../src/index'

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
})
