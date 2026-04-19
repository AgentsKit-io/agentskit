---
'@agentskit/core': minor
'@agentskit/memory': minor
---

Phase 3 sprint S23 — issues #176, #177, #178.

- `@agentskit/core/self-debug` (subpath) —
  `wrapToolWithSelfDebug(tool, debugger, options)` retries on
  `execute` failure with user-supplied corrected args.
  `createLlmSelfDebugger(complete)` wraps any completion fn into a
  debugger that reads the error + schema + args and emits JSON
  corrections. `maxAttempts`, `onEvent` (success/failure/retry/
  give-up) included.
- `@agentskit/memory` — five new `VectorMemory` implementations
  over the shared contract: `pgvector` (BYO SQL runner),
  `pinecone`, `qdrant`, `chroma`, `upstashVector`. All return
  normalized `score` and support optional `threshold` filtering.
- `@agentskit/memory` — `createEncryptedMemory` wraps any
  `ChatMemory` with AES-GCM (Web Crypto, 256-bit). Backing store
  only sees ciphertext; keys never leave the caller. Optional AAD
  binds ciphertext to a tenant / room. Idempotent on re-save.

~85 new tests.
