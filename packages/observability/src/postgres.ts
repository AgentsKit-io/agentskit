import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { bigint, bigserial, boolean, check, index, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import {
  CostReservationError,
  describeCostWindow,
  monthlyWindowKey,
  validateCostCommit,
  validateCostRelease,
  validateCostReserve,
  validateCostWindow,
  type CostStore,
  type CostStoreOptions,
  type CostWindow,
} from './cost-store'

const usd = (name: string) => numeric(name, { precision: 20, scale: 9 })

/** Drizzle schema: committed and reserved spend per tenant and accounting window. */
export const postgresCostWindowTable = pgTable('agentskit_cost_window', {
  tenantId: text('tenant_id').notNull(),
  windowKey: text('window_key').notNull(),
  spentUsd: usd('spent_usd').notNull().default('0'),
  reservedUsd: usd('reserved_usd').notNull().default('0'),
}, table => [primaryKey({ columns: [table.tenantId, table.windowKey] })])

/** Drizzle schema: one row per reservation, the idempotency record of reserve/commit/release. */
export const postgresCostReservationTable = pgTable('agentskit_cost_reservation', {
  tenantId: text('tenant_id').notNull(),
  reservationId: text('reservation_id').notNull(),
  windowKey: text('window_key').notNull(),
  amountUsd: usd('amount_usd').notNull(),
  actualUsd: usd('actual_usd'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({ columns: [table.tenantId, table.reservationId] }),
  check('agentskit_cost_reservation_status_check', sql`${table.status} IN ('reserved', 'committed', 'released')`),
])

/** Drizzle schema: append-only usage ledger written when a reservation is committed. */
export const postgresUsageLedgerTable = pgTable('agentskit_usage_ledger', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenantId: text('tenant_id').notNull(),
  reservationId: text('reservation_id').notNull(),
  model: text('model').notNull(),
  promptTokens: bigint('prompt_tokens', { mode: 'number' }).notNull(),
  completionTokens: bigint('completion_tokens', { mode: 'number' }).notNull(),
  costUsd: usd('cost_usd').notNull(),
  source: text('source'),
  fallback: boolean('fallback').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('agentskit_usage_ledger_tenant_created').on(table.tenantId, table.createdAt)])

/** Idempotent PostgreSQL DDL; execute with the host's migration connection before use. */
export const postgresCostMigrationSql = `CREATE TABLE IF NOT EXISTS agentskit_cost_window (
  tenant_id text NOT NULL,
  window_key text NOT NULL,
  spent_usd numeric(20, 9) NOT NULL DEFAULT 0,
  reserved_usd numeric(20, 9) NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, window_key)
);
CREATE TABLE IF NOT EXISTS agentskit_cost_reservation (
  tenant_id text NOT NULL,
  reservation_id text NOT NULL,
  window_key text NOT NULL,
  amount_usd numeric(20, 9) NOT NULL,
  actual_usd numeric(20, 9),
  status text NOT NULL CHECK (status IN ('reserved', 'committed', 'released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, reservation_id)
);
CREATE TABLE IF NOT EXISTS agentskit_usage_ledger (
  id bigserial PRIMARY KEY,
  tenant_id text NOT NULL,
  reservation_id text NOT NULL,
  model text NOT NULL,
  prompt_tokens bigint NOT NULL,
  completion_tokens bigint NOT NULL,
  cost_usd numeric(20, 9) NOT NULL,
  source text,
  fallback boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agentskit_usage_ledger_tenant_created ON agentskit_usage_ledger (tenant_id, created_at);`

/** Host-owned Drizzle connection plus the accounting window policy. */
export interface PostgresCostStoreOptions extends CostStoreOptions {
  db: Pick<NodePgDatabase, 'execute'>
}

type Row = Record<string, unknown>

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown): boolean {
  for (let current: unknown = error, depth = 0; current && depth < 4; depth++) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/**
 * Durable `CostStore` on PostgreSQL. Each operation is one statement, so a
 * reservation is admitted against the cap atomically without an explicit
 * transaction. BYO Drizzle/pg connection; the caller owns migration and lifetime.
 *
 * Do not call `reserve` inside a transaction of your own without a savepoint:
 * when two calls race on one reservation id, the loser's statement ends in a
 * unique violation that the store absorbs, but PostgreSQL has already aborted
 * the enclosing transaction.
 *
 * A reservation that is never committed or released keeps its amount held (a
 * crashed process, for example). Run `expirePostgresCostReservations` on a
 * schedule to return those holds.
 */
export function postgresCostStore({ db, windowKey: keyOf = monthlyWindowKey, now = () => new Date() }: PostgresCostStoreOptions): CostStore {
  const rows = async (query: ReturnType<typeof sql>): Promise<Row[]> => (await db.execute(query)).rows as Row[]

  const window = async (tenant: string, windowKey: string, capUsd?: number): Promise<CostWindow> => {
    const [row] = await rows(sql`SELECT spent_usd, reserved_usd FROM agentskit_cost_window WHERE tenant_id = ${tenant} AND window_key = ${windowKey}`)
    return describeCostWindow(tenant, windowKey, Number(row?.spent_usd ?? 0), Number(row?.reserved_usd ?? 0), capUsd)
  }

  const reservation = async (tenant: string, reservationId: string): Promise<{ windowKey: string; status: string }> => {
    const [row] = await rows(sql`SELECT window_key, status FROM agentskit_cost_reservation WHERE tenant_id = ${tenant} AND reservation_id = ${reservationId}`)
    if (!row) throw new CostReservationError('AK_COST_RESERVATION_NOT_FOUND', reservationId)
    return { windowKey: String(row.window_key), status: String(row.status) }
  }

  return {
    async reserve(input) {
      validateCostReserve(input)
      const { tenant, reservationId, amountUsd } = input
      const windowKey = input.windowKey ?? keyOf(now())
      const cap = input.capUsd ?? null
      let admitted: Row[]
      try {
        admitted = await rows(sql`WITH held AS (
          INSERT INTO agentskit_cost_window AS w (tenant_id, window_key, reserved_usd)
          SELECT ${tenant}, ${windowKey}, ${amountUsd}::numeric
          WHERE (${cap}::numeric IS NULL OR ${amountUsd}::numeric <= ${cap}::numeric)
            AND NOT EXISTS (SELECT 1 FROM agentskit_cost_reservation WHERE tenant_id = ${tenant} AND reservation_id = ${reservationId})
          ON CONFLICT (tenant_id, window_key) DO UPDATE SET reserved_usd = w.reserved_usd + EXCLUDED.reserved_usd
          WHERE ${cap}::numeric IS NULL OR w.spent_usd + w.reserved_usd + EXCLUDED.reserved_usd <= ${cap}::numeric
          RETURNING w.spent_usd, w.reserved_usd
        ), saved AS (
          INSERT INTO agentskit_cost_reservation (tenant_id, reservation_id, window_key, amount_usd, status)
          SELECT ${tenant}, ${reservationId}, ${windowKey}, ${amountUsd}::numeric, 'reserved' FROM held
        )
        SELECT spent_usd, reserved_usd FROM held`)
      } catch (error) {
        // A concurrent reserve with the same id won; this statement rolled back whole.
        if (!isUniqueViolation(error)) throw error
        admitted = []
      }
      const [row] = admitted
      if (row) {
        return { ok: true, reservationId, window: describeCostWindow(tenant, windowKey, Number(row.spent_usd), Number(row.reserved_usd), input.capUsd) }
      }
      const [existing] = await rows(sql`SELECT window_key, status FROM agentskit_cost_reservation WHERE tenant_id = ${tenant} AND reservation_id = ${reservationId}`)
      // A released reservation holds nothing, so replaying it as admitted would let the call run unaccounted.
      if (existing?.status === 'released') throw new CostReservationError('AK_COST_RESERVATION_RELEASED', reservationId)
      if (existing) return { ok: true, reservationId, window: await window(tenant, String(existing.window_key), input.capUsd) }
      return { ok: false, reason: 'quota_exceeded', window: await window(tenant, windowKey, input.capUsd) }
    },
    async commit(input) {
      validateCostCommit(input)
      const { tenant, reservationId, actualUsd } = input
      const usage = JSON.stringify((input.usage ?? []).map(entry => ({
        model: entry.model,
        prompt_tokens: Math.round(entry.promptTokens),
        completion_tokens: Math.round(entry.completionTokens),
        cost_usd: entry.costUsd,
        source: entry.source ?? null,
        fallback: entry.fallback ?? false,
      })))
      const [row] = await rows(sql`WITH settled AS (
        UPDATE agentskit_cost_reservation SET status = 'committed', actual_usd = ${actualUsd}::numeric
        WHERE tenant_id = ${tenant} AND reservation_id = ${reservationId} AND status = 'reserved'
        RETURNING window_key, amount_usd
      ), ledger AS (
        INSERT INTO agentskit_usage_ledger (tenant_id, reservation_id, model, prompt_tokens, completion_tokens, cost_usd, source, fallback)
        SELECT ${tenant}, ${reservationId}, e.model, e.prompt_tokens, e.completion_tokens, e.cost_usd, e.source, e.fallback
        FROM settled, jsonb_to_recordset(${usage}::jsonb)
          AS e(model text, prompt_tokens bigint, completion_tokens bigint, cost_usd numeric, source text, fallback boolean)
      )
      UPDATE agentskit_cost_window AS w
      SET reserved_usd = w.reserved_usd - settled.amount_usd, spent_usd = w.spent_usd + ${actualUsd}::numeric
      FROM settled WHERE w.tenant_id = ${tenant} AND w.window_key = settled.window_key
      RETURNING w.window_key, w.spent_usd, w.reserved_usd`)
      if (row) return describeCostWindow(tenant, String(row.window_key), Number(row.spent_usd), Number(row.reserved_usd), undefined)
      const existing = await reservation(tenant, reservationId)
      if (existing.status === 'released') throw new CostReservationError('AK_COST_RESERVATION_RELEASED', reservationId)
      return window(tenant, existing.windowKey)
    },
    async release(input) {
      validateCostRelease(input)
      const { tenant, reservationId } = input
      const [row] = await rows(sql`WITH settled AS (
        UPDATE agentskit_cost_reservation SET status = 'released'
        WHERE tenant_id = ${tenant} AND reservation_id = ${reservationId} AND status = 'reserved'
        RETURNING window_key, amount_usd
      )
      UPDATE agentskit_cost_window AS w SET reserved_usd = w.reserved_usd - settled.amount_usd
      FROM settled WHERE w.tenant_id = ${tenant} AND w.window_key = settled.window_key
      RETURNING w.window_key, w.spent_usd, w.reserved_usd`)
      if (row) return describeCostWindow(tenant, String(row.window_key), Number(row.spent_usd), Number(row.reserved_usd), undefined)
      const existing = await reservation(tenant, reservationId)
      if (existing.status === 'committed') throw new CostReservationError('AK_COST_RESERVATION_COMMITTED', reservationId)
      return window(tenant, existing.windowKey)
    },
    async window(input) {
      validateCostWindow(input)
      return window(input.tenant, input.windowKey ?? keyOf(now()), input.capUsd)
    },
  }
}

/** Options of `expirePostgresCostReservations`. */
export interface ExpirePostgresCostReservationsOptions {
  db: Pick<NodePgDatabase, 'execute'>
  /** Reservations still held and created before this instant are released. */
  olderThan: Date
}

/**
 * Release reservations that were never committed or released, and return how
 * many. The store has no background reaper: schedule this with a cutoff longer
 * than your slowest call (for example, one hour), or a call still running loses
 * its hold and its later `commit` is rejected as already released.
 */
export async function expirePostgresCostReservations({ db, olderThan }: ExpirePostgresCostReservationsOptions): Promise<number> {
  const result = await db.execute(sql`WITH expired AS (
    UPDATE agentskit_cost_reservation SET status = 'released'
    WHERE status = 'reserved' AND created_at < ${olderThan.toISOString()}::timestamptz
    RETURNING tenant_id, window_key, amount_usd
  ), totals AS (
    SELECT tenant_id, window_key, sum(amount_usd) AS amount_usd, count(*) AS reservations FROM expired GROUP BY tenant_id, window_key
  )
  UPDATE agentskit_cost_window AS w SET reserved_usd = w.reserved_usd - totals.amount_usd
  FROM totals WHERE w.tenant_id = totals.tenant_id AND w.window_key = totals.window_key
  RETURNING totals.reservations`)
  return (result.rows as Row[]).reduce((released, row) => released + Number(row.reservations), 0)
}
