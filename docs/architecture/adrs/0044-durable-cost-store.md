# ADR 0044 — Durable tenant cost store

- **Status**: Proposed (implementation authorized; evidence review remains external)
- **Date**: 2026-10-09

## Context

The cost guards in @agentskit/observability keep spend in closure state. On
hosts that run many short-lived instances, each instance starts at zero, so a
tenant budget is never reached and concurrent requests cannot see each other.
A budget that must hold needs spend recorded outside the process, and admission
that is atomic under concurrency.

## Decision

Add a `CostStore` port to @agentskit/observability with four tenant-scoped
operations: `reserve`, `commit`, `release` and `window`.

- `reserve` holds an estimate against a cap passed by the caller. The cap is an
  argument, not stored state, so the host reads it from its own plan data.
- `commit` replaces the hold with the real spend and appends usage ledger rows.
- `release` returns the hold when the call fails.
- Each operation is idempotent per `(tenant, reservationId)`. Settling an
  unknown, released or committed reservation raises `CostReservationError`.
- Spend is grouped by an accounting `windowKey`, the UTC month by default.

Ship two implementations: `createInMemoryCostStore` for development and tests,
and `postgresCostStore` on the optional `/postgres` subpath, with BYO Drizzle
and node-postgres, exported schema and idempotent DDL. Each PostgreSQL operation
is one statement; admission is the conditional update
`spent + reserved + amount <= cap`, so no explicit transaction is required and
the store works with a pooled or a per-request connection.

Export `costStoreContract` on `/cost-store-contract` as the framework-free
suite any implementation must pass.

`costGuard`, `multiTenantCostGuard` and `createAdvancedCostGuard` accept an
optional `store`. With it they write each priced `llm:end` to the store and
trip on the stored window total. Without it they keep the existing
process-local behavior and warn once in a production runtime: `NODE_ENV=production`,
or Cloudflare Workers when `NODE_ENV` is not set. `warnWithoutStore` overrides
the detection. A store write that fails goes to `onError`; a guard without
`onError` logs the first failure once.

Reservations have no time to live in the store. `expirePostgresCostReservations`
releases the ones still held and older than a cutoff the host chooses; the host
schedules it. `recordCostSpend` releases its own hold when the commit fails.

## Consequences

- Existing guard options and behavior are unchanged when `store` is omitted,
  apart from the production warning.
- With a store, a guard budget applies to the store's current accounting
  window instead of the lifetime of one guard instance.
- Guards observe spend after it happens and write to the store asynchronously,
  so they bound overshoot to in-flight calls. Hosts that must refuse a request
  before it spends call `reserve` directly.
- `commit` records the real spend even above the reserved estimate. The cap is
  a hard ceiling on reservations, not on provider usage already incurred.
- `drizzle-orm` and `pg` become optional peers, required only by `/postgres`.
- A released reservation id is not admitted again: `reserve` raises
  `AK_COST_RESERVATION_RELEASED`. Replaying it as admitted would let the call
  run without a hold and then fail to commit.
- A reservation abandoned by a crashed process stays held until the host runs
  the expiry. A cutoff shorter than a call still in flight releases its hold,
  and that call's `commit` is then rejected.
- `reserve` must run outside a host transaction or inside a savepoint. A
  concurrent duplicate id ends in a unique violation that the store absorbs,
  which still aborts an enclosing transaction.
- The CommonJS build of each subpath has its own copy of
  `CostReservationError`. The contract suite and hosts match errors by `code`.
- The advanced guard's rolling window caps (`perMinute`, `perDay`, custom)
  remain process-local; only the overall budget reads the store.

## Alternatives considered

- **Store the cap in the cost tables.** Rejected: plan limits belong to the
  host's billing data, and a second copy would drift.
- **Interactive transaction with `SELECT … FOR UPDATE`.** Rejected: it needs a
  dedicated connection per reservation and does not suit pooled HTTP drivers.
- **Record spend only, without reservations.** Rejected: concurrent requests
  would all pass a check made before any of them commits.
