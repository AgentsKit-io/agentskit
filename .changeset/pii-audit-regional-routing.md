---
"@agentskit/core": patch
"@agentskit/observability": minor
"@agentskit/adapters": minor
---

Add PII redaction audit helpers backed by the signed audit log and data-residency-aware adapter routing. PII redaction hits now include offsets and lengths for evidence, observability can append `pii:redact` / `pii:reveal` / `pii:reveal-denied` events into the hash chain, and adapter routers can require `eu`, `us`, or `apac` candidates. Closes #794 #795
