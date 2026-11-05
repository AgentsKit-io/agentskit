---
'@agentskit/adapters': minor
---

feat: add `createModelGateway` — one adapter for OpenRouter, Anthropic, OpenAI and CLIProxyAPI with per-call usage/cost and typed `BudgetExceededError` per-call and named-budget ceilings. `anthropic()` now accepts an injectable `fetch`.
