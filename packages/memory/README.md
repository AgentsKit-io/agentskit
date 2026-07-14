# @agentskit/memory

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="../../apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

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
- Package guide: https://www.agentskit.io/docs/packages/memory
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/memory gives agents continuity: chat history, vector memory, graph memory, encrypted stores, and local or hosted backends.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/memory) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

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
import { sqliteChatMemory, fileVectorMemory } from '@agentskit/memory'

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

### Chat memory (3)

- `fileChatMemory({ path })` — JSON on disk; zero infra.
- `sqliteChatMemory({ path })` — WAL-mode SQLite; indexed by session.
- `redisChatMemory({ client, keyPrefix })` — distributed, serverless-friendly.

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

### Vector memory (7)

- `fileVectorMemory` — pure-JS, file-persisted (good to ~10k vectors).
- `redisVectorMemory` — Redis Stack / Redis 8+ HNSW.
- `pgvector` — BYO SQL runner (`postgres.js`, `pg`, Drizzle, Prisma, Neon).
- `pinecone` — managed; namespaces + metadata filters.
- `qdrant` — self-hosted or cloud via HTTP.
- `chroma` — HTTP collection client.
- `upstashVector` — serverless HTTP.

Same 3-method `VectorStore` contract — swap without touching agent code.

### Higher-order wrappers (6)

- `createHierarchicalMemory` — MemGPT-style tiers: working / recall / archival. [Recipe](https://www.agentskit.io/docs/recipes/hierarchical-memory).
- `createVirtualizedMemory` — hot window + cold retriever for long sessions. [Recipe](https://www.agentskit.io/docs/recipes/virtualized-memory).
- `createAutoSummarizingMemory` *(via `@agentskit/core/auto-summarize`)* — fold oldest turns into a running summary. [Recipe](https://www.agentskit.io/docs/recipes/auto-summarize).
- `createEncryptedMemory` — AES-GCM-256 envelope over any `ChatMemory`; keys never leave the caller. [Recipe](https://www.agentskit.io/docs/recipes/encrypted-memory).
- `createInMemoryGraph` — knowledge graph (nodes + edges + BFS). [Recipe](https://www.agentskit.io/docs/recipes/graph-memory).
- `createInMemoryPersonalization` + `renderProfileContext` — per-user trait profile. [Recipe](https://www.agentskit.io/docs/recipes/personalization).

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
