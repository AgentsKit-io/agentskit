---
'@agentskit/templates': minor
---

feat(templates): memory adapter blueprint — closes K/P1.

Adds `memory-vector` and `memory-chat` to `ScaffoldType`, with
matching blueprint generators in `blueprints/memory.ts`:

- `generateVectorMemorySource(name)` — emits a `VectorMemory`
  skeleton wired to a generic HTTP backend, with the `store` /
  `search` / `delete` triple stubbed and `MemoryError` / `ErrorCodes`
  imports already wired (so first-error path is correct from day one).
- `generateChatMemorySource(name)` — emits a `ChatMemory` skeleton
  with `load` / `save` / `clear`, `serializeMessages` /
  `deserializeMessages` import, and typed errors on the failure
  branches.
- `generateVectorMemoryTest(name)` — minimal test asserting upsert
  endpoint hit + `MemoryError` raised on non-2xx.

`scaffold({ type: 'memory-vector' | 'memory-chat', name, dir })`
emits a complete package skeleton — package.json, tsconfig,
tsup.config, src/index.ts, tests/index.test.ts, README.md.

Templates package: 21 → 23 tests.
