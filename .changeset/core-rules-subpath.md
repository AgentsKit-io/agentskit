---
'@agentskit/core': minor
---

Publish the static guardrail rules, canonical JSON/SHA-256 helpers, and secret redaction helpers from `@agentskit/core/rules`, `@agentskit/core/hash`, and `@agentskit/core/security`. Add `createId(prefix)` to the core entrypoint using `crypto.randomUUID`; retain `generateId(prefix)` as the compatible prefixed helper.
