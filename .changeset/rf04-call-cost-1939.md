---
'@agentskit/adapters': minor
'@agentskit/cli': patch
---

feat: add `computeCallCost` to `@agentskit/adapters/catalog` and attach `metadata.cost` (input/output tokens, `costUsd` from the models.dev catalog, `usageReported`) to the `done` chunk of `createModelProvider`, with config `priceOverrides`; responses without usage are flagged `usageReported: false`. The CLI cost pricing now delegates to the catalog instead of its own hardcoded table. Bare model ids missing from the models.dev catalog (for example `claude-opus-4`, `claude-sonnet-4`, `claude-haiku-4`) are no longer priced; hosts should call `registerPricing` for them.
