---
'@agentskit/adapters': patch
'@agentskit/core': patch
'@agentskit/memory': patch
---

chore(audit): Sprint B/D — typed error hierarchy adoption (adapters + memory).

Replaces ~25 bare `throw new Error(...)` sites with the typed
`AdapterError` / `MemoryError` / `ConfigError` subclasses from
`@agentskit/core/errors`. Every error now carries a stable `code`, a
machine-friendly `name`, an actionable `hint`, and a docs URL.

**Adapters** — `mock`, `bedrock`, `fallback`, `router`, `ensemble`,
`webllm`, `embedders/openai-compatible`. The `ensemble` "all branches
failed" error now carries a `branchErrors: Array<{ id, error }>` field
so callers can diagnose without re-running.

**Memory** — `file-vector` / `redis-client` / `sqlite` / `turso` peer
install errors → `MemoryError(AK_MEMORY_PEER_MISSING)`. `encrypted`
key-length / SubtleCrypto guards → `ConfigError` /
`MemoryError(AK_MEMORY_LOAD_FAILED)`. Vector backends `upstash`,
`chroma`, `weaviate`, `qdrant`, `pinecone`, `milvus`, `supabase` HTTP
errors → `MemoryError(AK_MEMORY_REMOTE_HTTP)` with URL + identity
context in the hint.

**Core** — adds two new codes: `AK_MEMORY_PEER_MISSING`,
`AK_MEMORY_REMOTE_HTTP`.

No message-string regressions — every error still satisfies the
existing test regex matchers.
