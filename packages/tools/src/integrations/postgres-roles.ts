import type { ToolDefinition } from '@agentskit/core'
import { postgresQuery, type PostgresExecuteResult } from './postgres'

/** Separate read and optional write executors, row limit, and denied statements. */
export interface PostgresRolesConfig {
  /**
   * Read-only client. Should be a Postgres connection / pool created with a
   * role that lacks write privileges, OR pointed at a read replica.
   */
  readClient: (sql: string, params: unknown[]) => Promise<PostgresExecuteResult>
  /**
   * Optional write client. When omitted, only the read tool is exposed.
   */
  writeClient?: (sql: string, params: unknown[]) => Promise<PostgresExecuteResult>
  /** Cap on returned rows. Default 200. Applied to both clients. */
  maxRows?: number
  /** Extra disallowed statements (e.g. \`COPY\`, \`LISTEN\`). */
  denyStatements?: string[]
}

/**
 * Build read-only and (optionally) write postgres tools from one config.
 *
 * Why this exists: a single \`postgres({ allowWrites: true })\` tool gives the
 * agent both read and write capability through the same surface. If the
 * agent gets confused — or prompt-injected — it can write where it meant to
 * read. Splitting them with two separate role-bound clients lets the system
 * enforce least-privilege at the database level, not just at the prompt
 * level.
 *
 * Typical wiring:
 *   - \`readClient\` is connected as a role with \`USAGE\` + \`SELECT\` only,
 *     ideally pointed at a read replica.
 *   - \`writeClient\` is connected as a role with the minimum write
 *     privileges the use case requires, on the primary.
 *
 * Surfaces:
 *   - \`postgres_read\`  — always exposed; refuses anything that isn't a
 *                          \`SELECT\` / \`WITH ... SELECT\` / \`EXPLAIN\`.
 *   - \`postgres_write\` — only exposed when \`writeClient\` is set; allows
 *                          \`INSERT\` / \`UPDATE\` / \`DELETE\` / \`MERGE\`.
 */
export function postgresWithRoles(config: PostgresRolesConfig): ToolDefinition[] {
  const read = postgresQuery({
    execute: config.readClient,
    allowWrites: false,
    maxRows: config.maxRows,
    denyStatements: config.denyStatements,
  }) as unknown as ToolDefinition
  read.name = 'postgres_read'
  read.description = 'Run a parameterized read-only SQL query against the read-replica / read-role connection.'

  if (!config.writeClient) return [read]

  const write = postgresQuery({
    execute: config.writeClient,
    allowWrites: true,
    maxRows: config.maxRows,
    denyStatements: config.denyStatements,
  }) as unknown as ToolDefinition
  write.name = 'postgres_write'
  write.description = 'Run a parameterized write SQL statement (INSERT/UPDATE/DELETE/MERGE) against the write-role connection.'

  return [read, write]
}
