# @agentskit/memory

Persist conversations and add vector search to your agents — swap backends without changing agent code.

[![npm version](https://img.shields.io/npm/v/@agentskit/memory?color=blue)](https://www.npmjs.com/package/@agentskit/memory)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/memory)](https://www.npmjs.com/package/@agentskit/memory)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/memory)](https://bundlephobia.com/package/@agentskit/memory)
[![license](https://img.shields.io/npm/l/@agentskit/memory)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/EmersonBraun/agentskit?style=social)](https://github.com/EmersonBraun/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `memory` · `vector-db` · `embeddings` · `rag` · `sqlite` · `redis` · `vector-search`

## Why memory

- **Conversations that survive restarts** — SQLite for local development, Redis for production; your agent remembers context across sessions with zero code changes
- **RAG-ready vector search** — store and retrieve embeddings with `fileVectorMemory` (pure JS, no native deps) or Redis vector search for scale
- **Plug any backend** — the `VectorStore` interface is 3 methods; bring LanceDB, Pinecone, or any custom store in minutes
- **One interface, every deployment target** — swap from `inMemory` to `sqlite` to `redis` without touching agent code

## Install

```bash
npm install @agentskit/memory better-sqlite3
# For production:  npm install redis
# For vectors:     npm install vectra
```

## Quick example

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

- Chat memory: `inMemoryChatMemory`, `sqliteChatMemory`, `redisChatMemory`, `fileChatMemory`
- Vector memory: `fileVectorMemory` (pure JS), `redisVectorMemory`
- `VectorMemory` interface — 3 methods, bring any custom store
- Memory contract v1 (ADR 0003) — substitutable across `runtime`, `useChat`, and `@agentskit/ink`

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Memory`, `VectorMemory` types |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | Chunking + retrieval on top of vector memory |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `memory` / `retriever` options |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | Embeddings for RAG |

## Contributors

<a href="https://github.com/EmersonBraun/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=EmersonBraun/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/EmersonBraun/agentskit)
