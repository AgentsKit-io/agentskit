import { ErrorCodes, ToolError, defineTool } from '@agentskit/core'

/**
 * Safe-mode Postgres query tool. The agent sees one tool: `postgres_query`.
 * You inject:
 *   - an async `execute` client (e.g. `pg` Pool.query, Neon's
 *     `sql`, Supabase's `postgres.query`) — we don't bundle a driver.
 *   - safe-mode policy: read-only by default, optional allow-list of
 *     statements and a configurable row cap.
 */

/** Rows and optional count returned by the injected SQL executor. */
export interface PostgresExecuteResult {
  rows: Array<Record<string, unknown>>
  rowCount: number
}

/** Executor, read-only policy, and row limit for PostgreSQL query tools. */
export interface PostgresConfig {
  /** Your async runner. Must be parameterized-safe. */
  execute: (sql: string, params: unknown[]) => Promise<PostgresExecuteResult>
  /** Allow writes (INSERT/UPDATE/DELETE). Default false. */
  allowWrites?: boolean
  /** Cap on returned rows. Default 200. */
  maxRows?: number
  /** Extra disallowed statement prefixes (applied after write guard). */
  denyStatements?: string[]
}

const WRITE_PREFIXES = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'DROP', 'ALTER', 'CREATE', 'GRANT', 'REVOKE']
const ALWAYS_DENY = ['VACUUM', 'REINDEX', 'CLUSTER', 'COPY']

function firstVerb(sql: string): string {
  const trimmed = sql.trim().replace(/^\(+/, '')
  const match = trimmed.match(/^[A-Za-z]+/)
  return (match?.[0] ?? '').toUpperCase()
}

/** Create a parameterized PostgreSQL query tool subject to the configured write policy.
 *
 * @param config SQL executor and query policy.
 * @returns A PostgreSQL query tool. */
export function postgresQuery(config: PostgresConfig) {
  const maxRows = Math.max(1, config.maxRows ?? 200)
  const extraDeny = new Set((config.denyStatements ?? []).map(s => s.toUpperCase()))
  return defineTool({
    name: 'postgres_query',
    description: 'Run a parameterized SQL query against Postgres. Read-only unless explicitly permitted.',
    schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query with $1, $2, ... placeholders.' },
        params: { type: 'array', description: 'Bound parameters in order.', items: {} },
      },
      required: ['sql'],
    } as const,
    async execute({ sql, params }) {
      const verb = firstVerb(String(sql))
      if (ALWAYS_DENY.includes(verb)) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `postgres: ${verb} is not allowed`,
        })
      }
      if (extraDeny.has(verb)) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `postgres: ${verb} is denied by policy`,
        })
      }
      if (!config.allowWrites && WRITE_PREFIXES.includes(verb)) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_INVALID_INPUT,
          message: `postgres: ${verb} requires allowWrites: true`,
        })
      }
      const result = await config.execute(String(sql), Array.isArray(params) ? params : [])
      return {
        rowCount: result.rowCount,
        rows: result.rows.slice(0, maxRows),
        truncated: result.rows.length > maxRows,
      }
    },
  })
}

/** Return the single query tool for a PostgreSQL executor.
 * @example
 * const [queryTool] = postgres({ execute })

 *
 * @param config SQL executor and query policy.
 * @returns The PostgreSQL query tool array. */
export function postgres(config: PostgresConfig) {
  return [postgresQuery(config)]
}
