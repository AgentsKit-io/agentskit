---
'@agentskit/observability': minor
---

feat: `CostStore` windows are exact and complete. Amounts are bound to PostgreSQL as nano-dollar decimals and `remainingUsd` / `utilization` are computed in nano-dollars, so `0.04 + 0.01` fills a `0.05` cap exactly. Every window now also reports `warning` against a configurable `warnAtUtilization` (store option or per `reserve` / `window` call) and `resetsAt`, the start of the next window (UTC month by default, or `windowResetsAt` for a custom `windowKey`). New export: `monthlyWindowResetsAt`. The shared `costStoreContract` gains a `money` check.
