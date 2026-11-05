---
'@agentskit/observability': minor
---

feat: abandoned `CostStore` reservations expire on their own. Pass `reservationTtlMs` to `createInMemoryCostStore` or `postgresCostStore`, and a reservation that is neither committed nor released within that time stops counting against the cap on the next store call, with no scheduled job. A late `commit` throws `AK_COST_RESERVATION_RELEASED`. Re-run `postgresCostMigrationSql` to add the `agentskit_cost_reservation_held` partial index.
