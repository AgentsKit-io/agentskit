---
sidebar_position: 1
---

# Runtime

`@agentskit/runtime` 是自主智能体的执行引擎。它运行 ReAct 循环——观察、思考、行动——直到模型给出最终答案或达到步数上限。

## 何时使用

- **无界面**智能体（CLI 工作进程、任务、测试），配合工具、记忆、检索以及可选的委派。
- 你已在使用 [`@agentskit/adapters`](../data-layer/adapters)；此处可使用相同的工厂函数。

交互式终端聊天请优先使用 [`@agentskit/ink`](../chat-uis/ink)；浏览器界面请优先使用 [`@agentskit/react`](../chat-uis/react)。

## 安装

```bash
npm install @agentskit/runtime @agentskit/adapters
```

[`@agentskit/core`](../packages/core) 会作为传递依赖被引入；若只需类型而不拉取完整 runtime 依赖图，可显式添加。

## 基本用法

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
})

const result = await runtime.run('What is 3 + 4?')
console.log(result.content) // "7"
```

### 演示适配器（无需 API 密钥）

```ts
import { createRuntime } from '@agentskit/runtime'
import { generic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: generic({ /* custom send/parse */ }),
})
```

## ReAct 循环

每次调用 `runtime.run()` 会进入如下循环：

```
observe  →  think  →  act  →  observe  →  ...
```

1. **Observe** — 从记忆或检索器获取上下文并注入提示。
2. **Think** — 将消息与工具发送给 LLM 并流式返回响应。
3. **Act** — 若 LLM 调用工具，则执行它们并将结果追加为 `tool` 消息。
4. 重复，直到模型返回纯文本响应或达到 `maxSteps`。

## `RunResult`

`runtime.run()` 解析为 `RunResult` 对象：

```ts
interface RunResult {
  content: string      // Final text response from the model
  messages: Message[]  // Full conversation including tool calls and results
  steps: number        // How many loop iterations ran
  toolCalls: ToolCall[] // Every tool call made during the run
  durationMs: number   // Total wall-clock time
}
```

### 示例

```ts
const result = await runtime.run('List the files in the current directory', {
  tools: [shell({ allowed: ['ls'] })],
})

console.log(result.content)   // Model's final answer
console.log(result.steps)     // e.g. 2
console.log(result.durationMs) // e.g. 1340
result.toolCalls.forEach(tc => {
  console.log(tc.name, tc.args, tc.result)
})
```

## `RuntimeConfig`

```ts
interface RuntimeConfig {
  adapter: AdapterFactory        // Required — the LLM provider
  tools?: ToolDefinition[]       // Tools available to the agent
  systemPrompt?: string          // Default system prompt
  memory?: ChatMemory            // Persist and reload conversation history
  retriever?: Retriever          // RAG source injected each step
  observers?: Observer[]         // Event listeners (logging, tracing)
  maxSteps?: number              // Max loop iterations (default: 10)
  temperature?: number
  maxTokens?: number
  delegates?: Record<string, DelegateConfig>
  maxDelegationDepth?: number    // Default: 3
}
```

## `RunOptions`

在 `runtime.run(task, options)` 中覆盖每次调用的默认值：

```ts
const result = await runtime.run('Summarize this document', {
  systemPrompt: 'You are a concise summarizer.',
  tools: [readFileTool],
  maxSteps: 5,
  skill: summarizer,
})
```

## 中止运行

传入 `AbortSignal` 可在运行中途取消。运行时在每一步以及每次工具调用前会检查该信号。

```ts
const controller = new AbortController()

setTimeout(() => controller.abort(), 5000) // cancel after 5 s

const result = await runtime.run('Long running task', {
  signal: controller.signal,
})
```

## 记忆

配置 `memory` 后，运行时在每次运行结束时保存全部消息。下次运行时会自动重新加载先前上下文。

```ts
import { createRuntime } from '@agentskit/runtime'
import { createInMemoryMemory } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  memory: createInMemoryMemory(),
})

await runtime.run('My name is Alice.')
const result = await runtime.run('What is my name?')
console.log(result.content) // "Your name is Alice."
```

持久存储请使用 `@agentskit/memory` 中的 [`sqliteChatMemory` 或 `redisChatMemory`](../data-layer/memory)。

记忆在组装好 `RunResult` 之后保存——若提前中止，截至中止点的部分消息仍会持久化。

## 检索器（RAG）

通过 `RuntimeConfig` 中的 `retriever` 传入 `Retriever`（例如来自 [`createRAG`](../data-layer/rag)）。每个循环步骤可在模型思考前注入检索到的上下文——与聊天 UI 的约定相同。

## 观察者

`observers` 接受来自 `@agentskit/core` 的 [`Observer`](../packages/core) 实例以监听底层事件。若需要结构化追踪，可配合 [`@agentskit/observability`](../infrastructure/observability)。

## 故障排除

| 现象 | 可能修复 |
|---------|------------|
| 达到 `maxSteps` 仍无答案 | 模型持续调用工具；提高 `maxSteps`、收紧工具描述，或调整系统提示。 |
| 工具超时 / 卡住 | 为 `signal` 设置截止时间；确保工具在过载时 reject。 |
| 无先前上下文 | 确认 `memory` 使用相同的 `conversationId`（对按 id 区分的后端）。 |
| 检索为空 | 检查嵌入维度是否与向量库一致；确认语料已完成入库。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/runtime`） · [Tools](./tools) · [Skills](./skills) · [Delegation](./delegation) · [@agentskit/core](../packages/core)
