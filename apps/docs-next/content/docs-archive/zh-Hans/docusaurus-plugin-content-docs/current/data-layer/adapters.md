---
sidebar_position: 1
---

# Adapters

`@agentskit/adapters` 将各受支持 AI 提供商规范为单一流式接口。换提供商只需改一行——应用其余部分保持不变。

## 何时使用

- 需要可即插即用的 **`AdapterFactory`** 用于 [`useChat`](../hooks/use-chat)、[`createRuntime`](../agents/runtime) 或 [`createChatController`](../packages/core)。
- 需要用于 [`@agentskit/rag`](./rag) 或向量记忆的 **嵌入器**。

若仅使用托管路由（例如 Vercel AI SDK 处理器），可能只需 `vercelAI`（见下文），无需其他提供商包。

## 安装

```bash
npm install @agentskit/adapters
```

Peer：[`@agentskit/core`](../packages/core)（由 UI/runtime 包拉入）。

## 公开接口（摘要）

| 类别 | 导出 |
|----------|---------|
| 聊天适配器 | `anthropic`, `openai`, `gemini`, `ollama`, `deepseek`, `grok`, `kimi`, `langchain`, `langgraph`, `vercelAI`, `generic`, `createAdapter` |
| 嵌入器 | `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder`, `createOpenAICompatibleEmbedder` |
| 类型 | `CreateAdapterConfig`, `GenericAdapterConfig`, 各提供商 `*Config`、嵌入器配置 |

## 内置提供商

### Anthropic

```ts
import { anthropic } from '@agentskit/adapters'

const adapter = anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-6',
  maxTokens: 4096,       // optional, default 4096
  baseUrl: 'https://api.anthropic.com', // optional
})
```

### OpenAI

```ts
import { openai } from '@agentskit/adapters'

const adapter = openai({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  baseUrl: 'https://api.openai.com', // optional
})
```

### Gemini

```ts
import { gemini } from '@agentskit/adapters'

const adapter = gemini({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-2.0-flash',
})
```

### Ollama（本地）

```ts
import { ollama } from '@agentskit/adapters'

const adapter = ollama({
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434', // optional
})
```

### DeepSeek

```ts
import { deepseek } from '@agentskit/adapters'

const adapter = deepseek({ apiKey: process.env.DEEPSEEK_API_KEY!, model: 'deepseek-chat' })
```

### Grok

```ts
import { grok } from '@agentskit/adapters'

const adapter = grok({ apiKey: process.env.XAI_API_KEY!, model: 'grok-3' })
```

### Kimi

```ts
import { kimi } from '@agentskit/adapters'

const adapter = kimi({ apiKey: process.env.KIMI_API_KEY!, model: 'moonshot-v1-8k' })
```

### LangChain / LangGraph

```ts
import { langchain, langgraph } from '@agentskit/adapters'
import { ChatOpenAI } from '@langchain/openai'

// Wrap any LangChain runnable
const adapter = langchain({
  runnable: new ChatOpenAI({ model: 'gpt-4o' }),
  mode: 'stream', // or 'events' for streamEvents()
})

// LangGraph: uses streamEvents under the hood
const graphAdapter = langgraph({ graph: myCompiledGraph })
```

### Vercel AI SDK

```ts
import { vercelAI } from '@agentskit/adapters'

// Points at a Next.js / Vercel AI route handler
const adapter = vercelAI({
  api: '/api/chat',
  headers: { 'X-Custom-Header': 'value' }, // optional
})
```

## 一行切换提供商

```ts
// Before
const adapter = anthropic({ apiKey, model: 'claude-sonnet-4-6' })

// After — nothing else changes
const adapter = openai({ apiKey, model: 'gpt-4o' })
```

## 使用 `createAdapter` 自定义适配器

若需要上面未列出的提供商，使用 `createAdapter`。提供返回 `Response` 或 `ReadableStream` 的 `send` 函数，以及产出 `StreamChunk` 的 `parse` 生成器。

```ts
import { createAdapter } from '@agentskit/adapters'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'

const adapter = createAdapter({
  send: async (request: AdapterRequest) => {
    return fetch('https://my-llm.example.com/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: request.messages }),
    })
  },
  parse: async function* (stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield { type: 'text', content: decoder.decode(value) }
    }
    yield { type: 'done' }
  },
  abort: () => { /* optional cancel logic */ },
})
```

最简单情况——发出原始文本的流——请改用 `generic`：

```ts
import { generic } from '@agentskit/adapters'

const adapter = generic({
  send: async (request) => {
    const res = await fetch('/api/my-llm', {
      method: 'POST',
      body: JSON.stringify({ messages: request.messages }),
    })
    return res.body!
  },
})
```

## 嵌入器函数

嵌入器返回 `EmbedFn`——`async (text: string) => number[]`——供 `@agentskit/rag` 与 `@agentskit/memory` 使用。

```ts
import {
  openaiEmbedder,
  geminiEmbedder,
  ollamaEmbedder,
  deepseekEmbedder,
  grokEmbedder,
  kimiEmbedder,
  createOpenAICompatibleEmbedder,
} from '@agentskit/adapters'

// OpenAI (default model: text-embedding-3-small)
const embed = openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! })

// Gemini
const embed = geminiEmbedder({ apiKey: process.env.GOOGLE_API_KEY!, model: 'text-embedding-004' })

// Ollama (local)
const embed = ollamaEmbedder({ model: 'nomic-embed-text' })

// OpenAI-compatible endpoint (Cohere, Voyage, etc.)
const embed = createOpenAICompatibleEmbedder({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-english-v3.0',
  baseUrl: 'https://api.cohere.com',
})
```

可将任意嵌入器直接传给 `createRAG` —— 见 [RAG](./rag.md)。

## `createAdapter` 常见陷阱

- **`parse`** 生成器最终必须产出 `{ type: 'done' }`（若提供商流式输出工具调用则还要产出工具块），否则消费者会卡在 `streaming`。
- **`abort`** 应取消底层 HTTP 请求或 reader，以便 UI 中的 `stop()` 生效。
- 复用 **`AdapterRequest`** 形状：启用工具时，模型期望 OpenAI 风格的 `messages` 加工具定义。

## 故障排除

| 问题 | 检查项 |
|-------|----------------|
| 401 / 403 | API 密钥环境变量与自托管网关的 `baseUrl`。 |
| 空流 | `parse` 未解码 SSE 或 NDJSON；与 `generic` + 已知良好路由对比。 |
| 工具 JSON 错误 | 提供商对工具 schema 的限制；缩短 `description` 或简化 schema。 |
| 嵌入器维度不匹配 | 向量索引 `dimensions` 须与模型一致（例如许多 OpenAI 嵌入为 1536）。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/adapters`） · [Memory](./memory) · [RAG](./rag) · [useChat](../hooks/use-chat) · [@agentskit/core](../packages/core)
