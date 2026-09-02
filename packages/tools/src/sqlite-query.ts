import { ConfigError, ErrorCodes, ToolError } from '@agentskit/core'
import type { ToolDefinition } from '@agentskit/core'

export interface SqliteQueryConfig {
  path: string
  /** Reserved for v2; only `true` is accepted today. */
  readOnly?: true
  /** Max rows returned. Defaults to 100. */
  maxRows?: number
}

interface SqliteDb {
  prepare(sql: string): {
    all(...args: unknown[]): Record<string, unknown>[]
    readonly?: boolean
  }
  pragma(source: string): unknown
  close(): void
}

interface SqliteCtor {
  new (path: string, options?: { readonly?: boolean; fileMustExist?: boolean }): SqliteDb
}

async function openDatabase(path: string): Promise<SqliteDb> {
  try {
    const mod = await import('better-sqlite3')
    const Database = (mod.default ?? mod) as unknown as SqliteCtor
    const db = new Database(path, { readonly: true })
    db.pragma('query_only = ON')
    return db
  } catch {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_PEER_MISSING,
      message: 'Install better-sqlite3 to use sqliteQueryTool: npm install better-sqlite3',
    })
  }
}

const WRITE_KEYWORDS = /\b(?:insert|update|delete|drop|create|alter|attach|detach|replace|reindex|vacuum|pragma)\b/i

export function sqliteQueryTool(config: SqliteQueryConfig): ToolDefinition {
  if (config.readOnly !== undefined && config.readOnly !== true) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'sqliteQueryTool: writes are not supported in v1 (readOnly must be true).',
    })
  }
  const maxRows = config.maxRows ?? 100
  if (!Number.isInteger(maxRows) || maxRows < 0) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'sqliteQueryTool: maxRows must be a finite non-negative integer',
    })
  }
  let dbPromise: Promise<SqliteDb> | null = null
  let disposed = false
  const getDb = (): Promise<SqliteDb> => {
    if (disposed) {
      return Promise.reject(new ToolError({ code: ErrorCodes.AK_TOOL_EXEC_FAILED, message: 'sqliteQueryTool: tool is disposed' }))
    }
    if (!dbPromise) dbPromise = openDatabase(config.path)
    return dbPromise
  }

  return {
    name: 'sqlite_query',
    description: `Run a read-only SQL query against a local SQLite database. Returns up to ${maxRows} rows.`,
    tags: ['sqlite', 'sql', 'database', 'read'],
    category: 'database',
    schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'A single SELECT-style SQL statement.' },
      },
      required: ['sql'],
    },
    execute: async (args) => {
      const sql = String(args.sql ?? '').trim()
      if (!sql) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'sqlite_query: missing sql argument',
        })
      }
      if (WRITE_KEYWORDS.test(sql)) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: 'sqlite_query: only read-only SELECT-style statements are allowed',
        })
      }
      const db = await getDb()
      const stmt = db.prepare(sql)
      const rows = stmt.all() as Record<string, unknown>[]
      const truncated = rows.length > maxRows
      return {
        rows: truncated ? rows.slice(0, maxRows) : rows,
        rowCount: rows.length,
        truncated,
      }
    },
    dispose: async () => {
      disposed = true
      const db = await dbPromise
      db?.close()
      dbPromise = null
    },
  }
}
