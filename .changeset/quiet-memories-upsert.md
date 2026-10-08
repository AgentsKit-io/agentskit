---
'@agentskit/memory': patch
---

Fix memory backend edge cases: preserve Redis vector bytes, prefer stable Vectra IDs where supported, protect adapter-owned metadata fields, keep file and localStorage fallback writes atomic, make SQLite KV eviction transactional when the opener supports transactions, preserve same-event-loop localStorage writes and expiration purges, bound vector KV TTL recall to `k` and reject foreign collection rows, aggregate erasure failures, and retry failed lazy initialization after best-effort cleanup of failed internally owned resources. Mongo Atlas uses ordered ID upserts when supported by the injected collection, replacing canonical fields while preserving unrelated host fields.
