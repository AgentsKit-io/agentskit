---
'@agentskit/observability': minor
---

feat: `CostStore.count` returns how many calls of a kind (`reserve({ kind })`) a tenant made in a window, counting committed calls and reservations still held within their TTL. The Postgres migration adds a nullable `kind` column and index.
