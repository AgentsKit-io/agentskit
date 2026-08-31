import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { sqliteQueryTool } from '../src/sqlite-query'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { unlink } from 'node:fs/promises'

interface SeedDb {
  exec(sql: string): void
  prepare(sql: string): { run(...args: unknown[]): void }
  close(): void
}

async function seedDb(path: string, rows: number): Promise<void> {
  const mod = await import('better-sqlite3')
  const Database = (mod.default ?? mod) as unknown as new (p: string) => SeedDb
  const db = new Database(path)
  db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)')
  const insert = db.prepare('INSERT INTO items (id, name) VALUES (?, ?)')
  for (let i = 1; i <= rows; i++) insert.run(i, `item-${i}`)
  db.close()
}

describe('sqliteQueryTool', () => {
  let dbPath: string

  beforeEach(async () => {
    dbPath = join(tmpdir(), `agentskit-sqlite-query-${Date.now()}-${Math.random().toString(36).slice(2)}.db`)
    await seedDb(dbPath, 5)
  })

  afterEach(async () => {
    try { await unlink(dbPath) } catch {}
  })

  it('satisfies ToolDefinition contract', () => {
    const tool = sqliteQueryTool({ path: dbPath })
    expect(tool.name).toBe('sqlite_query')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.category).toBe('database')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('returns rows from a SELECT', async () => {
    const tool = sqliteQueryTool({ path: dbPath })
    const result = await tool.execute({ sql: 'SELECT id, name FROM items ORDER BY id' }) as {
      rows: Array<{ id: number; name: string }>
      rowCount: number
      truncated: boolean
    }
    expect(result.rows).toHaveLength(5)
    expect(result.rows[0]).toEqual({ id: 1, name: 'item-1' })
    expect(result.rowCount).toBe(5)
    expect(result.truncated).toBe(false)
  })

  it('truncates when row count exceeds maxRows', async () => {
    const big = join(tmpdir(), `agentskit-sqlite-query-big-${Date.now()}.db`)
    await seedDb(big, 150)
    try {
      const tool = sqliteQueryTool({ path: big })
      const result = await tool.execute({ sql: 'SELECT * FROM items' }) as {
        rows: unknown[]
        rowCount: number
        truncated: boolean
      }
      expect(result.rows.length).toBe(100)
      expect(result.rowCount).toBe(150)
      expect(result.truncated).toBe(true)
    } finally {
      await unlink(big).catch(() => {})
    }
  })

  it('respects custom maxRows', async () => {
    const tool = sqliteQueryTool({ path: dbPath, maxRows: 2 })
    const result = await tool.execute({ sql: 'SELECT * FROM items' }) as {
      rows: unknown[]
      truncated: boolean
    }
    expect(result.rows).toHaveLength(2)
    expect(result.truncated).toBe(true)
  })

  it('rejects writes', async () => {
    const tool = sqliteQueryTool({ path: dbPath })
    await expect(tool.execute({ sql: "INSERT INTO items (id, name) VALUES (99, 'x')" }))
      .rejects.toThrow(/read-only/)
    await expect(tool.execute({ sql: 'DROP TABLE items' })).rejects.toThrow(/read-only/)
    await expect(tool.execute({ sql: 'UPDATE items SET name = ?' })).rejects.toThrow(/read-only/)
  })

  it('rejects empty sql', async () => {
    const tool = sqliteQueryTool({ path: dbPath })
    await expect(tool.execute({ sql: '' })).rejects.toThrow(/missing sql/)
  })

  it('rejects readOnly: false in config', () => {
    expect(() => sqliteQueryTool({ path: dbPath, readOnly: false as unknown as true }))
      .toThrow(/v1/)
  })

  it('rejects invalid maxRows at configuration time', () => {
    expect(() => sqliteQueryTool({ path: dbPath, maxRows: -1 })).toThrow(/maxRows/)
    expect(() => sqliteQueryTool({ path: dbPath, maxRows: Number.NaN })).toThrow(/maxRows/)
    expect(() => sqliteQueryTool({ path: dbPath, maxRows: Number.POSITIVE_INFINITY })).toThrow(/maxRows/)
  })

  it('closes the native database handle deterministically', async () => {
    const tool = sqliteQueryTool({ path: dbPath })
    await tool.execute!({ sql: 'SELECT 1' }, {} as never)
    await tool.dispose!()
    await expect(tool.execute!({ sql: 'SELECT 1' }, {} as never)).rejects.toThrow(/disposed/)
  })
})
