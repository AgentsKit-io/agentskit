---
'@agentskit/core': minor
'@agentskit/memory': minor
---

feat(memory + core): three memory additions:

- `VectorFilter` contract v1 (#461) — normalized metadata-filter shape on `VectorMemory.search(...)`. Operators: `$eq` / `$ne` / `$in` / `$nin` / `$gt` / `$gte` / `$lt` / `$lte` / `$exists`, plus `$and` / `$or` for composition. Primitive shorthand = `$eq`. `matchesFilter` exported from `@agentskit/memory` for in-memory / file-backed evaluation; native backends translate to their own filter language. `fileVectorMemory.search()` now applies `options.filter` over-fetching for accurate top-K post-filter.
- `tursoChatMemory` (#456) — libSQL / Turso-backed chat memory mirroring the `sqliteChatMemory` shape. `@libsql/client` is an optional peer dep loaded lazily; `file:` URLs work for local dev.
- `supabaseVectorStore` (#459) — Supabase-hosted pgvector via the existing `pgvector` adapter wired to a Supabase RPC runner. `@supabase/supabase-js` is an optional peer dep loaded lazily; expects an `agentskit_execute_sql` RPC server-side.
