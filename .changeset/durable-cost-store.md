---
'@agentskit/observability': minor
---

Add the `CostStore` port (`reserve`, `commit`, `release`, `window`) for durable, tenant-scoped spend accounting, with `createInMemoryCostStore` for development and an optional `@agentskit/observability/postgres` subpath: BYO Drizzle/node-postgres store with atomic cap admission, idempotent reservations, a usage ledger, exported schema and migration SQL. `@agentskit/observability/cost-store-contract` exports the contract suite for custom stores.

`costGuard`, `multiTenantCostGuard` and `createAdvancedCostGuard` accept an optional `store`. With it, each priced call is written to the store and the budget is checked against spend recorded by every instance in the current accounting window (UTC month by default). Without it behavior is unchanged, except for a one-time warning in production runtimes (`NODE_ENV=production`, or Cloudflare Workers with `NODE_ENV` unset; `warnWithoutStore` overrides it), because process-local totals do not hold across instances or isolates. A store write that fails goes to `onError`, or to one warning when no handler is set. `costGuard` also accepts `tenant` to name the store partition.

`expirePostgresCostReservations({ db, olderThan })` releases reservations that were never settled; the store has no background reaper. `reserve` with the id of a released reservation throws `AK_COST_RESERVATION_RELEASED`. Match `CostReservationError` by `code`: each CommonJS subpath bundles its own copy of the class.
