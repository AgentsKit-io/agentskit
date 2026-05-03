import { ConfigError, ErrorCodes, ToolError, defineTool } from '@agentskit/core'
import type { PostgresExecuteResult } from './postgres'

/**
 * Postgres change-data-capture (CDC) primitives. Two consumer modes:
 *
 *   - Logical replication (`pgoutput` / `wal2json`) via
 *     `pg-logical-replication` or your own streaming client.
 *   - Supabase realtime via `@supabase/realtime-js`.
 *
 * Heavy drivers are not bundled — pass a `CdcAdminClient` (any
 * parameterised SQL runner: `pg`, Neon `sql`, Supabase
 * `postgres.query`) for the slot-management tools, and a
 * `CdcStreamClient` adapter for long-running streams (used by
 * `@agentskit/triggers` in AgentsKitOS T-9).
 *
 * Tool primitives are one-shot and fit `execute` semantics: status,
 * create/drop slot, advance, peek-N. The continuous AsyncIterable
 * stream is exposed as a helper, not a tool.
 */

export type CdcOp = 'insert' | 'update' | 'delete' | 'truncate' | 'schema'

export interface CdcChangeEvent {
  op: CdcOp
  schema: string
  table: string
  lsn?: string
  commitTs?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
}

export interface CdcSlotStatus {
  slotName: string
  active: boolean
  walLagBytes?: number
  restartLsn?: string
  confirmedFlushLsn?: string
  plugin?: string
  database?: string
}

export interface CdcAdminClient {
  execute: (sql: string, params: unknown[]) => Promise<PostgresExecuteResult>
}

export interface CdcStreamOptions {
  signal?: AbortSignal
  startLsn?: string
}

export interface CdcStreamClient {
  stream: (options?: CdcStreamOptions) => AsyncIterable<CdcChangeEvent>
}

export interface PostgresCdcConfig {
  admin?: CdcAdminClient
  stream?: CdcStreamClient
  slotName: string
  publication?: string
  plugin?: 'pgoutput' | 'wal2json'
  /** Cap rows returned by peek. Default 100. */
  maxPeek?: number
}

const VALID_IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/
const VALID_LSN = /^[0-9A-Fa-f]{1,8}\/[0-9A-Fa-f]{1,8}$/

function assertIdent(name: string, label: string): void {
  if (!VALID_IDENT.test(name)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${label} must match /^[A-Za-z_][A-Za-z0-9_]{0,62}$/, got: ${name}`,
    })
  }
}

function assertLsn(value: string, label: string): void {
  if (!VALID_LSN.test(value)) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_INVALID_INPUT,
      message: `${label} must look like '0/16B6360', got: ${value}`,
    })
  }
}

function requireAdmin(config: PostgresCdcConfig, fn: string): CdcAdminClient {
  if (!config.admin) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `${fn}: config.admin is required`,
      hint: 'Provide a CdcAdminClient adapter (e.g. wrap pg.Pool.query).',
    })
  }
  return config.admin
}

export function postgresCdcStatus(config: PostgresCdcConfig) {
  const admin = requireAdmin(config, 'postgresCdcStatus')
  assertIdent(config.slotName, 'slotName')
  return defineTool({
    name: 'postgres_cdc_status',
    description: 'Inspect a Postgres logical replication slot — active, restart/confirmed LSN, WAL lag bytes.',
    schema: { type: 'object', properties: {} } as const,
    async execute() {
      const result = await admin.execute(
        `SELECT slot_name, plugin, database, active, restart_lsn::text AS restart_lsn,
                confirmed_flush_lsn::text AS confirmed_flush_lsn,
                pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)::bigint AS wal_lag_bytes
         FROM pg_replication_slots
         WHERE slot_name = $1`,
        [config.slotName],
      )
      const row = result.rows[0]
      if (!row) {
        return { exists: false as const, slotName: config.slotName }
      }
      const status: CdcSlotStatus & { exists: true } = {
        exists: true,
        slotName: String(row.slot_name),
        active: Boolean(row.active),
        plugin: row.plugin == null ? undefined : String(row.plugin),
        database: row.database == null ? undefined : String(row.database),
        restartLsn: row.restart_lsn == null ? undefined : String(row.restart_lsn),
        confirmedFlushLsn:
          row.confirmed_flush_lsn == null ? undefined : String(row.confirmed_flush_lsn),
        walLagBytes: row.wal_lag_bytes == null ? undefined : Number(row.wal_lag_bytes),
      }
      return status
    },
  })
}

export function postgresCdcCreateSlot(config: PostgresCdcConfig) {
  const admin = requireAdmin(config, 'postgresCdcCreateSlot')
  assertIdent(config.slotName, 'slotName')
  const plugin = config.plugin ?? 'pgoutput'
  return defineTool({
    name: 'postgres_cdc_create_slot',
    description: 'Create a Postgres logical replication slot if it does not already exist.',
    schema: { type: 'object', properties: {} } as const,
    requiresConfirmation: true,
    async execute() {
      try {
        const result = await admin.execute(
          'SELECT pg_create_logical_replication_slot($1, $2) AS info',
          [config.slotName, plugin],
        )
        return { created: true, slotName: config.slotName, plugin, info: result.rows[0]?.info }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (/already exists/i.test(message)) {
          return { created: false, slotName: config.slotName, plugin, reason: 'exists' as const }
        }
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `postgres_cdc_create_slot: ${message}`,
          hint: 'Check wal_level=logical, max_replication_slots, and that the role has REPLICATION.',
        })
      }
    },
  })
}

export function postgresCdcDropSlot(config: PostgresCdcConfig) {
  const admin = requireAdmin(config, 'postgresCdcDropSlot')
  assertIdent(config.slotName, 'slotName')
  return defineTool({
    name: 'postgres_cdc_drop_slot',
    description: 'Drop a Postgres logical replication slot. Destructive — frees retained WAL.',
    schema: { type: 'object', properties: {} } as const,
    requiresConfirmation: true,
    async execute() {
      try {
        await admin.execute('SELECT pg_drop_replication_slot($1)', [config.slotName])
        return { dropped: true, slotName: config.slotName }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (/does not exist/i.test(message)) {
          return { dropped: false, slotName: config.slotName, reason: 'missing' as const }
        }
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `postgres_cdc_drop_slot: ${message}`,
          hint: 'A slot cannot be dropped while a replication client is still connected.',
        })
      }
    },
  })
}

export function postgresCdcAdvance(config: PostgresCdcConfig) {
  const admin = requireAdmin(config, 'postgresCdcAdvance')
  assertIdent(config.slotName, 'slotName')
  return defineTool({
    name: 'postgres_cdc_advance',
    description: 'Advance a logical replication slot to a target LSN. Discards intermediate changes.',
    schema: {
      type: 'object',
      properties: { lsn: { type: 'string', description: 'Target LSN, e.g. 0/16B6360' } },
      required: ['lsn'],
    } as const,
    requiresConfirmation: true,
    async execute({ lsn }) {
      const target = String(lsn)
      assertLsn(target, 'lsn')
      try {
        const result = await admin.execute(
          'SELECT pg_replication_slot_advance($1, $2::pg_lsn) AS info',
          [config.slotName, target],
        )
        return { advanced: true, slotName: config.slotName, targetLsn: target, info: result.rows[0]?.info }
      } catch (err) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `postgres_cdc_advance: ${err instanceof Error ? err.message : String(err)}`,
          hint: 'pg_replication_slot_advance requires Postgres ≥ 11 and a logical slot.',
        })
      }
    },
  })
}

export function postgresCdcPeek(config: PostgresCdcConfig) {
  const admin = requireAdmin(config, 'postgresCdcPeek')
  assertIdent(config.slotName, 'slotName')
  const cap = Math.max(1, config.maxPeek ?? 100)
  return defineTool({
    name: 'postgres_cdc_peek',
    description: 'Peek up to N changes from a logical slot without advancing the confirmed LSN.',
    schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: `Max changes to return. Capped at ${cap}.` },
        upto_lsn: { type: 'string', description: 'Optional upper-bound LSN.' },
      },
    } as const,
    async execute({ limit, upto_lsn }) {
      const requested = typeof limit === 'number' ? limit : 25
      const n = Math.min(cap, Math.max(1, requested))
      const upto = typeof upto_lsn === 'string' ? upto_lsn : null
      if (upto !== null) assertLsn(upto, 'upto_lsn')
      try {
        const result = await admin.execute(
          'SELECT lsn::text AS lsn, xid::text AS xid, data FROM pg_logical_slot_peek_changes($1, $2::pg_lsn, $3)',
          [config.slotName, upto, n],
        )
        const changes = result.rows.map(row => ({
          lsn: row.lsn == null ? undefined : String(row.lsn),
          xid: row.xid == null ? undefined : String(row.xid),
          data: row.data == null ? undefined : String(row.data),
        }))
        return { count: changes.length, truncated: changes.length >= n, changes }
      } catch (err) {
        throw new ToolError({
          code: ErrorCodes.AK_TOOL_EXEC_FAILED,
          message: `postgres_cdc_peek: ${err instanceof Error ? err.message : String(err)}`,
          hint: 'pg_logical_slot_peek_changes requires the same plugin as the slot was created with.',
        })
      }
    },
  })
}

export function postgresCdc(config: PostgresCdcConfig) {
  const admin = requireAdmin(config, 'postgresCdc')
  void admin
  return [
    postgresCdcStatus(config),
    postgresCdcCreateSlot(config),
    postgresCdcDropSlot(config),
    postgresCdcAdvance(config),
    postgresCdcPeek(config),
  ]
}

/**
 * Helper for AgentsKitOS T-9 CDC trigger and other long-running
 * consumers. Returns an AsyncIterable from the injected stream
 * client; aborts cleanly when the supplied AbortSignal fires.
 */
export function createCdcStream(
  config: PostgresCdcConfig,
  options?: CdcStreamOptions,
): AsyncIterable<CdcChangeEvent> {
  if (!config.stream) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'createCdcStream: config.stream is required',
      hint: 'Provide a CdcStreamClient adapter (pg-logical-replication or @supabase/realtime-js).',
    })
  }
  return config.stream.stream(options)
}
