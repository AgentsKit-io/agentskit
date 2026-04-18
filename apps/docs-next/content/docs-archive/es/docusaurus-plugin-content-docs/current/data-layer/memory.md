---
sidebar_position: 2
---

# Memoria

`@agentskit/memory` ofrece backends intercambiables para el historial de chat (`ChatMemory`) y la búsqueda vectorial semántica (`VectorMemory`). Todos los backends usan **importaciones diferidas** — el driver subyacente solo se carga la primera vez que se usa la memoria, así que los backends no usados no añaden coste en tiempo de ejecución.

## Cuándo usarlo

- **Persistir transcripciones** entre recargas o reinicios del servidor (`sqliteChatMemory`, `redisChatMemory`).
- **Almacenar embeddings** para búsqueda semántica, RAG o recuperación personalizada (`fileVectorMemory`, `redisVectorMemory`, o un `VectorStore` personalizado).

Para pruebas rápidas sin persistencia, usa [`createInMemoryMemory`](../packages/core) de `@agentskit/core` (sin drivers extra).

## Instalación

```bash
npm install @agentskit/memory
```

[`@agentskit/core`](../packages/core) define `ChatMemory` y `VectorMemory` (traído por paquetes de UI/runtime/RAG).

## Resumen del contrato

**`ChatMemory`** (conceptual): cargar y guardar el `Message[]` de la conversación para una sesión (el id de conversación u equivalente depende del backend).

**`VectorMemory`**: insertar o actualizar documentos con embeddings, consultar por vector (similitud coseno), borrar por id. Se usa directamente o vía [`createRAG`](./rag).

## Exportaciones públicas

| Exportación | Tipo |
|--------|------|
| `sqliteChatMemory`, `redisChatMemory` | Persistencia de chat |
| `fileVectorMemory`, `redisVectorMemory` | Persistencia vectorial |
| Tipos: `SqliteChatMemoryConfig`, `RedisChatMemoryConfig`, `FileVectorMemoryConfig`, `RedisVectorMemoryConfig`, `VectorStore`, `VectorStoreDocument`, `VectorStoreResult`, `RedisClientAdapter`, `RedisConnectionConfig` | Configuración y puntos de extensión |

## Comparación de backends

| Backend | Tipo | Persistencia | Dependencia extra | Ideal para |
|---|---|---|---|---|
| `sqliteChatMemory` | Chat | Archivo (SQLite) | `better-sqlite3` | Un solo servidor, desarrollo local |
| `redisChatMemory` | Chat | Remoto (Redis) | `redis` | Varias instancias, producción |
| `redisVectorMemory` | Vector | Remoto (Redis Stack) | `redis` | Búsqueda semántica en producción |
| `fileVectorMemory` | Vector | Archivo (JSON vía vectra) | `vectra` | Desarrollo local, prototipos |

## Memoria de chat

La memoria de chat persiste el historial entre sesiones. Pásala a `useChat` con la opción `memory`.

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

La base de datos y la tabla se crean automáticamente en el primer uso.

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

### Usar memoria de chat con `useChat`

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

## Memoria vectorial

La memoria vectorial almacena embeddings para búsqueda semántica. La usa `@agentskit/rag` pero también puedes consultarla directamente.

### Basada en archivos (vectra)

```bash
npm install vectra
```

```ts
import { fileVectorMemory } from '@agentskit/memory'

const store = fileVectorMemory({
  path: './vector-index', // directory where the index files are stored
})
```

### Vector Redis (Redis Stack / Redis Cloud)

Requiere una instancia de Redis con el [módulo RediSearch](https://redis.io/docs/interact/search-and-query/) habilitado (Redis Stack, Redis Cloud, Upstash con Search).

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

El índice HNSW se crea automáticamente en la primera escritura.

### Almacenar y buscar manualmente

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

## VectorStore personalizado

Proporciona tu propio almacenamiento implementando la interfaz `VectorStore`. Pásala a `fileVectorMemory` con la opción `store`.

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

## RedisClientAdapter para portabilidad entre librerías

Si ya tienes un cliente Redis (p. ej. `ioredis`), envuélvelo con `RedisClientAdapter` en lugar de dejar que la librería cree su propia conexión.

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

## Patrón de importaciones diferidas

Todos los backends cargan sus drivers con un `import()` o `require()` dinámico en el primer uso. Solo pagas el coste de `better-sqlite3`, `redis` o `vectra` cuando ese backend se instancia de verdad — no al cargar el módulo.

## Solución de problemas

| Problema | Qué revisar |
|-------|----------------|
| Falla la instalación de `better-sqlite3` | Complemento nativo; usa Node LTS y arquitectura coincidente, o cambia a Redis. |
| Errores de vector en Redis | Asegura RediSearch / módulo vectorial; `dimensions` coincide con la salida del embedder. |
| Resultados de búsqueda vacíos | Umbral demasiado alto; modelo de embedding distinto entre ingesta y consulta. |
| Varios usuarios ven el mismo historial | Usa `conversationId` distinto por usuario/sesión en la memoria de chat. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/memory`) · [Adaptadores](./adapters) · [RAG](./rag) · [useChat](../hooks/use-chat) · [@agentskit/core](../packages/core)
