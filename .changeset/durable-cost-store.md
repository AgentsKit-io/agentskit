---
'@agentskit/observability': minor
---

Add the `CostStore` port (`reserve`, `commit`, `release`, `window`) for durable, tenant-scoped spend accounting, with `createInMemoryCostStore` for development and an optional `@agentskit/observability/postgres` subpath: BYO Drizzle/node-postgres store with atomic cap admission, idempotent reservations, a usage ledger, exported schema and migration SQL. `@agentskit/observability/cost-store-contract` exports the contract suite for custom stores.

`costGuard`, `multiTenantCostGuard` and `createAdvancedCostGuard` accept an optional `store`. With it, each priced call is written to the store and the budget is checked against spend recorded by every instance in the current accounting window (UTC month by default). Without it behavior is unchanged, except for a one-time warning when `NODE_ENV=production`, because process-local totals do not hold across instances or isolates. `costGuard` also accepts `tenant` to name the store partition.
