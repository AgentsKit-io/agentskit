---
sidebar_position: 3
---

# RAG（检索增强生成）

用即插即用的 RAG 为智能体增加知识检索。

## 何时使用

- 有**文档或知识库**，需在模型权重之外为回答提供依据。
- 已在使用 [`@agentskit/memory`](./memory) **向量**后端与 [`@agentskit/adapters`](./adapters) **嵌入器**。

`createRAG` 串联 **分块 → 嵌入 → 存储 → 检索**；向量存放位置仍由你选择（文件、Redis 或自定义存储）。

## 安装

```bash
npm install @agentskit/rag @agentskit/memory @agentskit/adapters
```

## 快速开始

```ts
import { createRAG } from '@agentskit/rag'
import { openaiEmbedder } from '@agentskit/adapters'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY }),
  store: fileVectorMemory({ path: './vectors' }),
})

// Ingest documents
await rag.ingest([
  { id: 'doc-1', content: 'AgentsKit is a JavaScript agent toolkit...' },
  { id: 'doc-2', content: 'The runtime supports ReAct loops...' },
])

// Retrieve relevant context
const docs = await rag.retrieve('How does AgentsKit work?', { topK: 3 })
```

## 与 Runtime 配合

```ts
import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  retriever: rag, // auto-injects retrieved context into prompts
})

const result = await runtime.run('Explain the AgentsKit architecture')
```

## 与 React 配合

```ts
import { useRAGChat } from '@agentskit/rag'
import { openai } from '@agentskit/adapters'

const chat = useRAGChat({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  rag,
})
```

## 生命周期：入库与检索

1. **`ingest(documents)`** — 将文本分块（见分块），嵌入每块并 upsert 到 `VectorMemory`。重复 `id` 按后端语义覆盖。
2. **`retrieve(query, { topK, threshold? })`** — 嵌入查询、执行向量搜索、返回排序后的块供提示使用。
3. **Runtime / `useRAGChat`** — 每轮代你调用 `retrieve`（或等价逻辑），使模型看到最新上下文。

源文档变更后需重新入库；无自动文件监视。

## 公开接口（摘要）

| 导出 | 作用 |
|--------|------|
| `createRAG(config)` | 工厂，返回带 `ingest`、`retrieve` 及兼容检索器接口的 RAG 实例 |
| `useRAGChat` | React 钩子：聊天 + 自动检索接线 |

## 分块

文档在嵌入前会自动分块：

```ts
const rag = createRAG({
  embed: openaiEmbedder({ apiKey }),
  store: fileVectorMemory({ path: './vectors' }),
  chunkSize: 512,    // characters per chunk (default: 1000)
  chunkOverlap: 50,  // overlap between chunks (default: 100)
})
```

## 自带嵌入器

任何符合 `(text: string) => Promise<number[]>` 的函数均可：

```ts
import { openaiEmbedder, geminiEmbedder, ollamaEmbedder } from '@agentskit/adapters'

openaiEmbedder({ apiKey, model: 'text-embedding-3-small' })
geminiEmbedder({ apiKey })
ollamaEmbedder({ model: 'nomic-embed-text' })

// Custom
const myEmbedder = async (text: string) => {
  const response = await fetch('/api/embed', { method: 'POST', body: text })
  return response.json()
}
```

## 向量存储

RAG 可与 `@agentskit/memory` 中任意 `VectorMemory` 配合：

| 存储 | 适用场景 |
|-------|----------|
| `fileVectorMemory` | 本地开发、小数据集 |
| `redisVectorMemory` | 生产、快速网络访问 |
| 自定义 `VectorStore` | LanceDB、Pinecone、Qdrant 等 |

## 故障排除

| 问题 | 检查项 |
|-------|----------------|
| 无结果 / 质量差 | 提高 `topK`、降低相似度 `threshold`、缩短 `chunkSize` 或改进分块重叠。 |
| 维度错误 | 嵌入器输出大小须与向量存储 `dimensions`（Redis）或首次写入推断规则一致。 |
| 答案陈旧 | 内容变更后重新 `ingest`；必要时清空或轮换向量路径/索引。 |
| 入库速率限制 | 减小批量；在 `ingest` 调用间退避；开发可用本地 `ollamaEmbedder`。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/rag`） · [Memory](./memory) · [Adapters](./adapters) · [Runtime](../agents/runtime) · [RAG Pipeline 示例](../examples/rag-pipeline) · [@agentskit/core](../packages/core)
