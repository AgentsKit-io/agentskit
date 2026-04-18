---
sidebar_position: 2
---

# Memória

`@agentskit/memory` fornece backends plugáveis para histórico de chat (`ChatMemory`) e busca vetorial semântica (`VectorMemory`). Todos os backends usam **imports preguiçosos** — o driver subjacente só é carregado quando a memória é usada pela primeira vez, então backends não usados não custam em runtime.

## Quando usar

- **Persistir transcrições de chat** entre recargas ou reinícios do servidor (`sqliteChatMemory`, `redisChatMemory`).
- **Armazenar embeddings** para busca semântica, RAG ou recuperação customizada (`fileVectorMemory`, `redisVectorMemory` ou um `VectorStore` customizado).

Para testes rápidos sem persistência, prefira [`createInMemoryMemory`](../packages/core) de `@agentskit/core` (sem drivers extras).

## Instalação

```bash
npm install @agentskit/memory
```

[`@agentskit/core`](../packages/core) define `ChatMemory` e `VectorMemory` (puxado pelos pacotes UI/runtime/RAG).

## Visão geral do contrato

**`ChatMemory`** (conceitual): carregar e salvar `Message[]` da conversa para uma sessão (id de conversa ou equivalente é específico do backend).

**`VectorMemory`**: upsert de documentos pesquisáveis com embeddings, consulta por vetor (similaridade de cosseno), exclusão por id. Usado diretamente ou via [`createRAG`](./rag).

## Exportações públicas

| Exportação | Tipo |
|--------|------|
| `sqliteChatMemory`, `redisChatMemory` | Persistência de chat |
| `fileVectorMemory`, `redisVectorMemory` | Persistência vetorial |
| Tipos: `SqliteChatMemoryConfig`, `RedisChatMemoryConfig`, `FileVectorMemoryConfig`, `RedisVectorMemoryConfig`, `VectorStore`, `VectorStoreDocument`, `VectorStoreResult`, `RedisClientAdapter`, `RedisConnectionConfig` | Configuração e pontos de extensão |

## Comparação de backends

| Backend | Tipo | Persistência | Dependência extra | Ideal para |
|---|---|---|---|---|
| `sqliteChatMemory` | Chat | Arquivo (SQLite) | `better-sqlite3` | Servidor único, dev local |
| `redisChatMemory` | Chat | Remoto (Redis) | `redis` | Multi-instância, produção |
| `redisVectorMemory` | Vector | Remoto (Redis Stack) | `redis` | Busca semântica em produção |
| `fileVectorMemory` | Vector | Arquivo (JSON via vectra) | `vectra` | Dev local, prototipagem |

## Memória de chat

A memória de chat persiste o histórico da conversa entre sessões. Passe-a a `useChat` via a opção `memory`.

### SQLite

```bash
npm install better-sqlite3
```

```ts
import { sqliteChatMemory } from '@agentskit/memory'

const memory = sqliteChatMemory({
  path: './chat.db',
  conversationId: 'user-123', // optional, default: 'default'
})
```

O banco e a tabela são criados automaticamente no primeiro uso.

### Redis

```bash
npm install redis
```

```ts
import { redisChatMemory } from '@agentskit/memory'

const memory = redisChatMemory({
  url: process.env.REDIS_URL!,         // e.g. redis://localhost:6379
  conversationId: 'user-123',          // optional
  keyPrefix: 'myapp:chat',             // optional, default: 'agentskit:chat'
})
```

### Usando memória de chat com `useChat`

```tsx
import { useChat } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import { sqliteChatMemory } from '@agentskit/memory'

const memory = sqliteChatMemory({ path: './chat.db', conversationId: 'session-1' })

function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
    memory,
  })
  // ...
}
```

## Memória vetorial

A memória vetorial armazena embeddings para busca semântica. É usada por `@agentskit/rag`, mas também pode ser consultada diretamente.

### Baseada em arquivo (vectra)

```bash
npm install vectra
```

```ts
import { fileVectorMemory } from '@agentskit/memory'

const store = fileVectorMemory({
  path: './vector-index', // directory where the index files are stored
})
```

### Vetor Redis (Redis Stack / Redis Cloud)

Exige uma instância Redis com o [módulo RediSearch](https://redis.io/docs/interact/search-and-query/) habilitado (Redis Stack, Redis Cloud, Upstash com Search).

```bash
npm install redis
```

```ts
import { redisVectorMemory } from '@agentskit/memory'

const store = redisVectorMemory({
  url: process.env.REDIS_URL!,
  indexName: 'myapp:docs:idx',    // optional
  keyPrefix: 'myapp:vec',         // optional
  dimensions: 1536,               // optional — auto-detected from first insert
})
```

O índice HNSW é criado automaticamente na primeira gravação.

### Armazenar e buscar manualmente

```ts
import { openaiEmbedder } from '@agentskit/adapters'

const embed = openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! })

// Store
await store.store([{
  id: 'doc-1',
  content: 'AgentsKit makes AI chat easy.',
  embedding: await embed('AgentsKit makes AI chat easy.'),
  metadata: { source: 'readme' },
}])

// Search
const queryEmbedding = await embed('how do I build a chatbot?')
const results = await store.search(queryEmbedding, { topK: 3, threshold: 0.7 })
```

## VectorStore customizado

Forneça seu próprio backend de armazenamento implementando a interface `VectorStore`. Passe-a a `fileVectorMemory` via a opção `store`.

```ts
import type { VectorStore, VectorStoreDocument, VectorStoreResult } from '@agentskit/memory'
import { fileVectorMemory } from '@agentskit/memory'

const myStore: VectorStore = {
  async upsert(docs: VectorStoreDocument[]): Promise<void> {
    // persist docs to your database
  },
  async query(vector: number[], topK: number): Promise<VectorStoreResult[]> {
    // return nearest neighbours
    return []
  },
  async delete(ids: string[]): Promise<void> {
    // remove by id
  },
}

const memory = fileVectorMemory({ path: '', store: myStore })
```

## RedisClientAdapter para portabilidade de biblioteca

Se você já tem um cliente Redis (por exemplo `ioredis`), envolva-o com `RedisClientAdapter` em vez de deixar a biblioteca criar sua própria conexão.

```ts
import type { RedisClientAdapter } from '@agentskit/memory'
import { redisChatMemory } from '@agentskit/memory'
import IORedis from 'ioredis'

const ioredis = new IORedis(process.env.REDIS_URL)

const clientAdapter: RedisClientAdapter = {
  get: (key) => ioredis.get(key),
  set: (key, value) => ioredis.set(key, value).then(() => undefined),
  del: (key) => ioredis.del(Array.isArray(key) ? key : [key]).then(() => undefined),
  keys: (pattern) => ioredis.keys(pattern),
  disconnect: () => ioredis.quit().then(() => undefined),
  call: (cmd, ...args) => ioredis.call(cmd, ...args.map(String)),
}

const memory = redisChatMemory({
  url: '',          // ignored when client is provided
  client: clientAdapter,
  conversationId: 'session-1',
})
```

## Padrão de imports preguiçosos

Todos os backends carregam seus drivers com `import()` ou `require()` dinâmico no primeiro uso. Isso significa que você só paga o custo de `better-sqlite3`, `redis` ou `vectra` quando aquele backend é de fato instanciado — não no carregamento do módulo.

## Solução de problemas

| Problema | O que verificar |
|-------|----------------|
| Falha na instalação do `better-sqlite3` | Addon nativo; use Node LTS e arquitetura compatível, ou mude para Redis. |
| Erros de vetor Redis | Garanta módulo RediSearch / vector; `dimensions` bate com a saída do embedder. |
| Resultados de busca vazios | Limiar alto demais; modelo de embedding errado entre ingest e consulta. |
| Vários usuários vendo o mesmo histórico | Defina `conversationId` distinto por usuário/sessão na memória de chat. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/memory`) · [Adaptadores](./adapters) · [RAG](./rag) · [useChat](../hooks/use-chat) · [@agentskit/core](../packages/core)
