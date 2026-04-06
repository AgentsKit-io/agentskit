# @agentskit/memory

Persistent and vector memory backends for [AgentsKit](https://github.com/EmersonBraun/agentskit).

## Install

```bash
npm install @agentskit/memory
```

Then install the backend(s) you need:

```bash
npm install better-sqlite3  # for sqliteChatMemory
npm install vectra           # for fileVectorMemory (default, pure JS)
npm install redis            # for redisChatMemory / redisVectorMemory
```

## Backends

| Factory | Contract | Underlying lib | Native? |
|---------|----------|---------------|---------|
| `sqliteChatMemory({ path })` | ChatMemory | better-sqlite3 | Yes |
| `redisChatMemory({ url })` | ChatMemory | redis | No |
| `redisVectorMemory({ url })` | VectorMemory | redis + RediSearch | No |
| `fileVectorMemory({ path })` | VectorMemory | vectra | No (pure JS) |

## Quick example

```ts
import { sqliteChatMemory, fileVectorMemory } from '@agentskit/memory'

// Chat persistence
const chatMemory = sqliteChatMemory({ path: './chat.db' })

// Vector search
const vectorMemory = fileVectorMemory({ path: './vectors' })
await vectorMemory.store([{
  id: 'doc-1',
  content: 'AgentsKit is awesome',
  embedding: [0.1, 0.2, 0.3, ...],
}])
const results = await vectorMemory.search([0.1, 0.2, 0.3, ...], { topK: 5 })
```

## Custom vector store

Bring your own vector backend (LanceDB, usearch, Pinecone, etc.):

```ts
import type { VectorStore } from '@agentskit/memory'

const myStore: VectorStore = {
  async upsert(docs) { /* your logic */ },
  async query(vector, topK) { /* your logic */ },
  async delete(ids) { /* your logic */ },
}

const memory = fileVectorMemory({ path: './vectors', store: myStore })
```

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
