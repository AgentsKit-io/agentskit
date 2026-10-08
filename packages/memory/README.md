# @agentskit/memory

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Persist conversations and add vector search to your agents — swap backends without changing agent code.

[![npm version](https://img.shields.io/npm/v/@agentskit/memory?color=blue)](https://www.npmjs.com/package/@agentskit/memory)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/memory)](https://www.npmjs.com/package/@agentskit/memory)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/memory?label=bundle)](https://bundlejs.com/?q=@agentskit/memory)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `memory` · `vector-db` · `embeddings` · `rag` · `sqlite` · `redis` · `vector-search`

## Verified proof

- Package metadata and tests live under `packages/memory/`.
- Package guide: https://www.agentskit.io/docs/reference/packages/memory
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/memory gives agents continuity: chat history, vector memory, graph memory, encrypted stores, and local or hosted backends.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/reference/packages/memory) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why memory

- **Conversations that survive restarts** — SQLite for local development, Redis for production; your agent remembers context across sessions with zero code changes
- **RAG-ready vector search** — store and retrieve embeddings with `fileVectorMemory` (pure JS, no native deps) or Redis vector search for scale
- **Plug any backend** — the `VectorStore` interface is 3 methods; bring LanceDB, Pinecone, or any custom store in minutes
- **One interface, every deployment target** — swap from `inMemory` to `sqlite` to `redis` without touching agent code

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/memory better-sqlite3
# For production:  npm install redis
# For vectors:     npm install vectra
```

## Quick example

<!-- readme-example:quickstart -->
```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { sqliteChatMemory } from '@agentskit/memory'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  memory: sqliteChatMemory({ path: './chat.db' }),
})

// Agent now remembers previous conversations across process restarts
const result = await runtime.run('What did we discuss yesterday?')
console.log(result.content)
```

## With RAG

Use a **vector** backend with [`@agentskit/rag`](https://www.npmjs.com/package/@agentskit/rag) `createRAG({ embed, store })` — `fileVectorMemory` and `redisVectorMemory` implement `VectorMemory` for chunk storage and search.

## Features

### Chat memory (4)

- `fileChatMemory({ path })` — JSON on disk; zero infra.
- `sqliteChatMemory({ path })` — WAL-mode SQLite; indexed by session.
- `redisChatMemory({ client, keyPrefix })` — distributed, serverless-friendly.
- `tursoChatMemory({ url, authToken? })` — hosted or local libSQL/Turso.

All on top of `createInMemoryMemory` / `createLocalStorageMemory` from
`@agentskit/core`.

### Browser Web Storage

Use the browser-safe subpath when a host needs validated, bounded storage or
`sessionStorage` instead of the legacy Core `localStorage` helper:

```ts
import { createWebStorageMemory } from '@agentskit/memory/web-storage'

const memory = createWebStorageMemory({
  key: 'app:chat',
  getStorage: () => typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
  maxMessages: 20,
  maxRecordBytes: 1_048_576,
})
```

Canonical records are runtime validated. Oversized saves reject with
`AK_MEMORY_SAVE_FAILED` before changing storage. `migration` may supply legacy
keys and a host-owned parser; a legacy key is removed only after canonical
persistence succeeds.

### Vector memory (11)

- `fileVectorMemory` — pure-JS, file-persisted (good to ~10k vectors).
- `redisVectorMemory` — Redis Stack / Redis 8+ HNSW.
- `pgvector` — BYO SQL runner (`postgres.js`, `pg`, Drizzle, Prisma, Neon).
- `pinecone` — managed; namespaces + metadata filters.
- `qdrant` — self-hosted or cloud via HTTP.
- `chroma` — Chroma v2 HTTP client with tenant, database, and token support.
- `upstashVector` — serverless HTTP.
- `supabaseVectorStore` — Supabase-hosted pgvector RPC.
- `weaviateVectorStore` — Weaviate Cloud or self-hosted HTTP.
- `milvusVectorStore` — Milvus/Zilliz REST API.
- `mongoAtlasVectorStore` — MongoDB Atlas Vector Search with an injected collection.

Vector adapters follow ADR 0003: a result is included only when its score is
strictly greater than `threshold`. Remote HTTP adapters accept `timeoutMs` and
`maxResponseBytes`, defaulting to 15 seconds and 2 MiB; both require positive
safe integers. Injected `fetch` and caller `signal` are also supported. Timeout
and response-limit failures use `AK_MEMORY_REMOTE_HTTP`. File KV writes are
atomic and serialized across instances in one process. They are not a
multi-process coordination primitive; use SQLite, Redis, or another external
store when several processes write the same file.

Same 3-method `VectorStore` contract — swap without touching agent code.

### Higher-order wrappers (6)

- `createHierarchicalMemory` — MemGPT-style tiers: working / recall / archival. [Recipe](https://www.agentskit.io/docs/reference/recipes/hierarchical-memory).
- `createVirtualizedMemory` — hot window + cold retriever for long sessions. [Recipe](https://www.agentskit.io/docs/reference/recipes/virtualized-memory).
- `createAutoSummarizingMemory` *(via `@agentskit/core/auto-summarize`)* — fold oldest turns into a running summary. [Recipe](https://www.agentskit.io/docs/reference/recipes/auto-summarize).
- `createEncryptedMemory` — AES-GCM-256 envelope over any `ChatMemory`; keys never leave the caller. [Recipe](https://www.agentskit.io/docs/reference/recipes/encrypted-memory).
- `createInMemoryGraph` — knowledge graph (nodes + edges + BFS). [Recipe](https://www.agentskit.io/docs/reference/recipes/graph-memory).
- `createInMemoryPersonalization` + `renderProfileContext` — per-user trait profile. [Recipe](https://www.agentskit.io/docs/reference/recipes/personalization).

Memory contract v1 (ADR 0003) — substitutable across `runtime`,
`useChat`, and every framework binding.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Memory`, `VectorMemory` types |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | Chunking + retrieval on top of vector memory |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `memory` / `retriever` options |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | Embeddings for RAG |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/memory`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).

### PostgreSQL chat memory (Node and Workers)

Install `drizzle-orm` and `pg` alongside this package. The optional
`@agentskit/memory/postgres` subpath exports `postgresChatMemory`,
`postgresChatTable` (Drizzle schema), and `postgresChatMigrationSql`.
Neither peer is imported by the main entry.

```ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import { postgresChatMemory, postgresChatMigrationSql } from '@agentskit/memory/postgres'

const pool = new Pool() // host owns connection configuration and shutdown
const db = drizzle(pool)
// Run once in your migration tooling, not on every request:
await db.execute(sql.raw(postgresChatMigrationSql))
const memory = postgresChatMemory({ db, tenantId: 'tenant-a', sessionId: 'session-a' })
await memory.save([])
await pool.end()
```

In Workers, enable `nodejs_compat`; create and connect a `pg.Client` inside each
request, pass `drizzle(client)`, and close it with `ctx.waitUntil(client.end())`
after all memory operations (and any stream using them) have finished. The
package never connects, migrates, or closes your client. A Node `Pool` can be
shared across requests. No Neon, Hyperdrive, or Cloudflare dependency is needed;
the host can supply their connection configuration when appropriate.

Every query uses both tenant and session, which form the primary key. Derive
these identifiers from trusted authorization context: caller-supplied tenant
names alone are not authorization. Saves atomically replace a versioned JSONB
snapshot, preserving parts, tools, metadata, dates, and message order. Concurrent
saves use last-writer-wins; this ChatMemory does not implement session CAS or
turn leases. Schema migration is explicit; SQL/connection errors propagate and
invalid records fail rather than silently discarding history.

No truncation is performed by default (CM1–CM6). Opt into `maxMessages: N` to
persist at most the last N array entries on each save, in their original order.
Leading tool results are discarded so truncation never starts inside a
contiguous assistant tool-call/result group; a tool-only suffix becomes `[]`.
This permanently removes older messages; it counts messages, not tokens or
bytes, and can drop a system prompt. For semantic
summarization or complete-turn retention, prepare the history in the host
instead. A positive safe integer is required; empty saves still persist `[]`.

The supported Drizzle peer range is `^0.44.0 || ^0.45.3`. Both lower bounds
passed the real PostgreSQL contract suite and the package typecheck.

`signal` rejects already-aborted operations before any SQL is issued. Loads
also check after SQL returns. Drizzle/pg does not cancel in-flight SQL here:
a save/clear already submitted can commit after an abort and will report its
actual SQL outcome. Configure query/statement timeouts on the host connection.

Optional defense-in-depth RLS (run as migration owner, access through a
non-owner role without BYPASSRLS; set tenant inside a host-managed transaction):

```sql
ALTER TABLE agentskit_chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentskit_chat_memory FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agentskit_chat_memory
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
```

Do not set a tenant on a shared pool connection outside a transaction. The host
must enforce role permissions and set its trusted tenant with transaction-local
`set_config('app.tenant_id', tenant, true)`.

Real acceptance checks (local disposable PostgreSQL 16, trust auth on loopback;
no production accounts):

```sh
docker run -d --name ak-memory-test -p 127.0.0.1:55439:5432 -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16
AK_POSTGRES_TEST_PORT=55439 pnpm --filter @agentskit/memory test:postgres
AK_POSTGRES_TEST_PORT=55439 pnpm --filter @agentskit/memory test:workerd
docker rm -f ak-memory-test
```

CI runs `test:postgres` against a PostgreSQL 16 service with trust authentication
and an explicit test port; no secrets are required. Locally it is skipped
without its explicit test port. `test:workerd`
runs `wrangler dev --local`, uses a Client per request and `waitUntil` shutdown,
and exercises the same synthetic contract suite as the Node Pool test.
