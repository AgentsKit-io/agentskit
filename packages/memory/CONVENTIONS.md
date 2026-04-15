# Conventions — `@agentskit/memory`

Memory backends implementing the two contracts from [ADR 0003](../../docs/architecture/adrs/0003-memory-contract.md): `ChatMemory` and `VectorMemory`.

## Scope

- **ChatMemory implementations**: `fileChatMemory`, `sqliteChatMemory`, `redisChatMemory`
- **VectorMemory implementations**: `fileVectorMemory`, `redisVectorMemory`
- Shared client helpers where reuse is genuine (`redis-client.ts`, `vector-store.ts`)

## Adding a new ChatMemory backend

1. Create `src/<name>-chat.ts`.
2. Export a factory: `export function sqliteChatMemory(opts): ChatMemory`.
3. Implement the six invariants CM1–CM6:
   - `load()` returns a snapshot
   - `save()` is **replace-all**, not append
   - Ordering preserved, atomic from consumer view
   - Empty state returns `[]`
   - `clear` optional
4. Re-export from `src/index.ts`.

## Adding a new VectorMemory backend

1. Create `src/<name>-vector.ts`.
2. Export a factory: `export function fileVectorMemory(opts): VectorMemory`.
3. Implement the eight invariants VM1–VM8:
   - `store` is **upsert by id**
   - Dimensionality is a constructor concern — reject mismatches
   - `search` returns descending-scored
   - `threshold` is exclusive from below
   - `topK` is an upper bound, not a floor
4. Re-export from `src/index.ts`.

## Configuration

- Connection details (file path, URL, credentials) taken at construction.
- Do not open connections until first use — defer to `load()` / `save()` / `store()` / `search()`.
- Provide a `close()` escape hatch for long-lived processes; the contracts don't require it but consumers appreciate it.

## Testing

- **In-memory fake** per contract for fast tests of consumers (`memory/fakes.ts` — not yet present, welcome to add).
- **Integration tests** for each backend using real storage (SQLite file, Redis testcontainer).
- **Invariant tests**: a shared test suite that every backend must pass (`MemoryContractSuite` — tracked for future).

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Implementing `save` as append | Replace-all (CM2). Consumers send full state. |
| Returning `null` from `load` on empty | Return `[]` |
| Mixing embedding dimensions in one vector store | Reject mismatches at `store()` time |
| Padding `search` results to reach `topK` | Return fewer documents; `topK` is an upper bound |
| Opening connections at import time | Defer to first method call |

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (80% lines)
- [ ] New backend tested against all relevant invariants
- [ ] Config accepted at construction; no env reads in the factory
- [ ] Documentation for the backend's quirks in package README
