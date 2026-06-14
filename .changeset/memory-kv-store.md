---
'@agentskit/memory': minor
---

Add a key-value memory store (`AgentskitMemoryStore`) — generic
`get(key)`/`set(key,value)` with TTL + max-key eviction — complementing the
conversation `ChatMemory` model. Backends: `createInMemoryStore`,
`createFileStore`, `createSqliteStore` (+ `tryDefaultSqliteOpener`),
`createLocalStorageStore`, `createRedisStore` (+ `adaptIoredis`,
`tryDefaultRedisClient`), `createVectorStore` (with `recall`), and the
`createKvMemoryFromConfig` / `createKvMemoryFromConfigAuto` dispatch over a
`KvMemoryConfig`. External drivers (sqlite/redis) and vector store/embedder are
injected; all additive — the ChatMemory/VectorMemory surface is unchanged.
