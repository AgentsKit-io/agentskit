---
'@agentskit/adapters': minor
'@agentskit/cli': patch
---

`createModelProvider` now attaches the call cost (`metadata.cost`: input/output tokens, `costUsd` from the models.dev catalog, `usageReported`) to the `done` chunk, with `priceOverrides` in the config. The CLI cost pricing now delegates to the catalog via `computeCallCost` instead of its own hardcoded table.
