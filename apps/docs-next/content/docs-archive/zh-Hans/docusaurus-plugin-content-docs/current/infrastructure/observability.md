---
sidebar_position: 1
---

# Observability

`@agentskit/observability` 为 [`@agentskit/core`](../packages/core) 的 `AgentEvent` 流提供**可插拔 `Observer`** 实现。观察者为惰性友好：仅导入接入 [`createRuntime`](../agents/runtime) 或 [`useChat`](../hooks/use-chat) 配置中 `observers` 的后端。

## 何时使用

- 智能体步骤期间需要**结构化日志**（`consoleLogger`）。
- 将追踪导出到 **LangSmith** 或 **OpenTelemetry** 兼容收集器。

## 安装

```bash
npm install @agentskit/observability @agentskit/core
```

## 内置观察者

### 控制台日志

```ts
import { consoleLogger } from '@agentskit/observability'

const observer = consoleLogger({ format: 'human' }) // or 'json'
```

Human：彩色、缩进 stderr。JSON：换行分隔事件，便于接入管道。

### LangSmith

```ts
import { langsmith } from '@agentskit/observability'

const observer = langsmith({
  apiKey: process.env.LANGSMITH_API_KEY,
  project: 'my-agent',
})
```

### OpenTelemetry（OTLP）

```ts
import { opentelemetry } from '@agentskit/observability'

const observer = opentelemetry({
  endpoint: 'http://localhost:4318/v1/traces',
  serviceName: 'my-agent-service',
})
```

在适用处遵循 GenAI 语义约定。

## 附加到 runtime

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { consoleLogger } from '@agentskit/observability'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  observers: [consoleLogger({ format: 'json' })],
})

await runtime.run('Hello')
```

将相同 `observers` 数组传给浏览器会话的 [`useChat`](../hooks/use-chat)。

## `createTraceTracker`

将 `AgentEvent` 转为开始/结束 span 回调的低级辅助——在需要**自定义导出器**但仍希望父子时间一致时使用。

```ts
import { createTraceTracker } from '@agentskit/observability'
import type { AgentEvent } from '@agentskit/core'

const tracker = createTraceTracker({
  onSpanStart(span) {
    /* send span open to your backend */
  },
  onSpanEnd(span) {
    /* close span */
  },
})

const bridge = {
  name: 'trace-bridge',
  on(event: AgentEvent) {
    tracker.handle(event)
  },
}
```

## `AgentEvent` 参考（core）

事件在 `@agentskit/core` 中定义（此处非穷尽——见 TypeDoc）：

| 事件类型 | 含义 |
|------------|---------|
| `llm:start` / `llm:first-token` / `llm:end` | 模型调用生命周期 |
| `tool:start` / `tool:end` | 工具执行 |
| `memory:load` / `memory:save` | 聊天记忆持久化 |
| `agent:step` | ReAct 步骤标记 |
| `agent:delegate:start` / `agent:delegate:end` | 子智能体委派 |
| `error` | 可恢复或致命错误表面 |

## 自定义观察者

实现 `@agentskit/core` 的 `Observer`：

```ts
import type { AgentEvent, Observer } from '@agentskit/core'

const myObserver: Observer = {
  name: 'my-backend',
  on(event: AgentEvent) {
    if (event.type === 'error') {
      console.error(event.error)
    }
  },
}
```

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| LangSmith 无 span | 验证 `LANGSMITH_API_KEY` 与项目名称；检查 CI 网络出站。 |
| OTLP 丢数据 | 确认采集器 URL 与 HTTP/protobuf 模式与栈一致。 |
| 重复日志 | 观察者去重——每个 `on` 都会收到所有事件。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/observability`） · [Eval](./eval) · [Runtime](../agents/runtime) · [@agentskit/core](../packages/core)
