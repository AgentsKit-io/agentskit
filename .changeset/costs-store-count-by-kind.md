---
'@agentskit/observability': minor
---

`CostStore.count` tallies the calls of one `kind` (set on `reserve`) for a tenant in a window, counting committed reservations and those still held within `reservationTtlMs`. The PostgreSQL migration adds a nullable `kind` column to `agentskit_cost_reservation`; re-run `postgresCostMigrationSql`.
