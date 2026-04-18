---
sidebar_position: 2
---

# Memory

`@agentskit/memory` 为聊天历史（`ChatMemory`）与语义向量搜索（`VectorMemory`）提供可插拔后端。所有后端使用**惰性导入**——底层驱动仅在首次使用记忆时加载，未使用的后端不增加运行时开销。

## 何时使用

- **持久化聊天记录**跨刷新或服务器重启（`sqliteChatMemory`、`redisChatMemory`）。
- **存储嵌入**用于语义搜索、RAG 或自定义检索（`fileVectorMemory`、`redisVectorMemory` 或自定义 `VectorStore`）。

快速测试且无需持久化时，优先使用 `@agentskit/core` 的 [`createInMemoryMemory`](../packages/core)（无额外驱动）。

## 安装

```bash
npm install @agentskit/memory
```

[`@agentskit/core`](../packages/core) 定义 `ChatMemory` 与 `VectorMemory`（由 UI/runtime/RAG 包拉入）。

## 契约概览

**`ChatMemory`**（概念上）：为会话加载并保存对话 `Message[]`（会话 id 或等价物因后端而异）。

**`VectorMemory`**：用嵌入 upsert 可搜索文档、按向量查询（余弦相似度）、按 id 删除。可直接使用或通过 [`createRAG`](./rag)。

## 公开导出

| 导出 | 类型 |
|--------|------|
| `sqliteChatMemory`, `redisChatMemory` | 聊天持久化 |
| `fileVectorMemory`, `redisVectorMemory` | 向量持久化 |
| 类型：`SqliteChatMemoryConfig`, `RedisChatMemoryConfig`, `FileVectorMemoryConfig`, `RedisVectorMemoryConfig`, `VectorStore`, `VectorStoreDocument`, `VectorStoreResult`, `RedisClientAdapter`, `RedisConnectionConfig` | 配置与扩展点 |

## 后端对比

| 后端 | 类型 | 持久化 | 额外依赖 | 适用场景 |
|---|---|---|---|---|
| `sqliteChatMemory` | 聊天 | 文件（SQLite） | `better-sqlite3` | 单机、本地开发 |
| `redisChatMemory` | 聊天 | 远程（Redis） | `redis` | 多实例、生产 |
| `redisVectorMemory` | 向量 | 远程（Redis Stack） | `redis` | 生产语义搜索 |
| `fileVectorMemory` | 向量 | 文件（vectra 的 JSON） | `vectra` | 本地开发、原型 |

## 聊天记忆

聊天记忆跨会话持久化对话历史。通过 `memory` 选项传给 `useChat`。

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

数据库与表在首次使用时自动创建。

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

### 与 `useChat` 使用聊天记忆

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

## 向量记忆

向量记忆存储嵌入以供语义搜索。由 `@agentskit/rag` 使用，也可直接查询。

### 基于文件（vectra）

```bash
npm install vectra
```

```ts
import { fileVectorMemory } from '@agentskit/memory'

const store = fileVectorMemory({
  path: './vector-index', // directory where the index files are stored
})
```

### Redis 向量（Redis Stack / Redis Cloud）

需要启用 [RediSearch 模块](https://redis.io/docs/interact/search-and-query/) 的 Redis 实例（Redis Stack、Redis Cloud、带 Search 的 Upstash）。

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

HNSW 索引在首次写入时自动创建。

### 手动存储与搜索

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

## 自定义 VectorStore

实现 `VectorStore` 接口以提供自有存储后端。通过 `store` 选项传给 `fileVectorMemory`。

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

## RedisClientAdapter 与库可移植性

若已有 Redis 客户端（例如 `ioredis`），请用 `RedisClientAdapter` 包装，而不是让库自建连接。

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

## 惰性导入模式

所有后端在首次使用时通过动态 `import()` 或 `require()` 加载驱动。这意味着仅在实际实例化该后端时才承担 `better-sqlite3`、`redis` 或 `vectra` 的成本——而非模块加载时。

## 故障排除

| 问题 | 检查项 |
|-------|----------------|
| `better-sqlite3` 安装失败 | 原生扩展；使用 Node LTS 与匹配架构，或改用 Redis。 |
| Redis 向量错误 | 确保 RediSearch / 向量模块；`dimensions` 与嵌入器输出一致。 |
| 搜索结果为空 | 阈值过高；入库与查询的嵌入模型不一致。 |
| 多用户看到相同历史 | 为聊天记忆按用户/会话设置不同的 `conversationId`。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/memory`） · [Adapters](./adapters) · [RAG](./rag) · [useChat](../hooks/use-chat) · [@agentskit/core](../packages/core)
