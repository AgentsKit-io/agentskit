---
'@agentskit/observability': minor
---

`CostStore.count` tallies the calls of one `kind` (set on `reserve`) for a tenant in a window, counting committed reservations and those still held within the deadline. The deadline is `input.reservationTtlMs`, or the store's own `reservationTtlMs` when omitted; every held reservation counts only when the store has none. The PostgreSQL migration adds a nullable `kind` column to `agentskit_cost_reservation`; re-run `postgresCostMigrationSql`.
