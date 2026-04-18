---
sidebar_position: 1
---

# @agentskit/react

基于 [`@agentskit/core`](../packages/core) 的 React 聊天 UI。提供三个钩子与七个通过 CSS 变量样式的无头组件。

## 何时使用

- 浏览器**流式聊天**，可插拔 LLM 适配器，可选工具、记忆、RAG 与技能。
- 需要**无头**标记（`data-ak-*`）及自有 CSS 或设计系统。

**可考虑** [`@agentskit/ink`](./ink) 用于终端应用，[`@agentskit/runtime`](../agents/runtime) 用于无 React 的无界面智能体。

## 安装

```bash
npm install @agentskit/react @agentskit/core
# optional: real AI providers
npm install @agentskit/adapters
```

## 钩子

### `useChat`

主钩子。创建并管理完整聊天会话。

```tsx
import { useChat } from '@agentskit/react'

const chat = useChat({
  adapter: myAdapter,          // required — AdapterFactory
  systemPrompt: 'You are...', // optional
  memory: myMemory,           // optional — ChatMemory
  tools: [...],               // optional — ToolDefinition[]
})
```

#### `useChat` 配置（`ChatConfig`）

| 选项 | 类型 | 说明 |
|--------|------|-------------|
| `adapter` | `AdapterFactory` | **必填。** 来自 `@agentskit/adapters` 或自定义的提供商工厂。 |
| `systemPrompt` | `string` | 发送时作为系统消息前置。 |
| `temperature` | `number` | 在支持时传给适配器。 |
| `maxTokens` | `number` | 在支持时限制生成长度上限。 |
| `tools` | `ToolDefinition[]` | 模型可调用的函数；结果以工具消息流回。 |
| `skills` | `SkillDefinition[]` | 增强系统提示并在发送前注入技能工具。 |
| `memory` | `ChatMemory` | 跨会话持久化并重新加载 `Message[]`（[Memory](../data-layer/memory)）。 |
| `retriever` | `Retriever` | 每轮注入检索上下文（[RAG](../data-layer/rag)）。 |
| `initialMessages` | `Message[]` | 首条用户消息前种子化会话记录。 |
| `onMessage` | callback | 控制器更新历史时，随每条持久化 `Message` 调用。 |
| `onError` | callback | 流或工具错误。 |
| `onToolCall` | callback | 观察或拦截工具执行（[Tools](../agents/tools)）。 |
| `observers` | `Observer[]` | 底层事件流（[Observability](../infrastructure/observability)）。 |

底层工具定义若请求确认，钩子还会暴露 **`approve` / `deny`** 等方法用于人在回路。

返回 `ChatReturn` 对象：

| 属性 | 类型 | 说明 |
|---|---|---|
| `messages` | `Message[]` | 完整会话历史 |
| `input` | `string` | 当前输入框值 |
| `status` | `'idle' \| 'streaming' \| 'error'` | 会话状态 |
| `error` | `Error \| null` | 最近一次错误（若有） |
| `send(text)` | `(text: string) => void` | 发送消息 |
| `stop()` | `() => void` | 中止当前流 |
| `retry()` | `() => void` | 重试上次请求 |
| `setInput(val)` | `(val: string) => void` | 更新输入值 |
| `clear()` | `() => void` | 清空会话 |
| `approve(id)` / `deny(id, reason?)` | | 在适用时确认或拒绝待处理工具调用。 |

### `useStream`

较低级钩子，直接消费单个 `StreamSource`。

```tsx
import { useStream } from '@agentskit/react'

const { text, status, error, stop } = useStream(source, {
  onChunk: (chunk) => console.log(chunk),
  onComplete: (full) => console.log('done', full),
  onError: (err) => console.error(err),
})
```

### `useReactive`

在属性变更时触发重渲染的响应式状态容器。

```tsx
import { useReactive } from '@agentskit/react'

const state = useReactive({ count: 0, label: 'hello' })
// Mutate directly — component re-renders automatically
state.count++
```

## 完整示例（演示适配器——无需 API 密钥）

```tsx
import { useChat, ChatContainer, Message, InputBar, ThinkingIndicator } from '@agentskit/react'
import type { AdapterFactory } from '@agentskit/react'
import '@agentskit/react/theme'

function createDemoAdapter(): AdapterFactory {
  return {
    createSource: ({ messages }) => {
      let cancelled = false
      return {
        stream: async function* () {
          const last = [...messages].reverse().find(m => m.role === 'user')
          const reply = `You said: "${last?.content ?? ''}". This is a demo response.`
          for (const chunk of reply.match(/.{1,20}/g) ?? []) {
            if (cancelled) return
            await new Promise(r => setTimeout(r, 40))
            yield { type: 'text' as const, content: chunk }
          }
          yield { type: 'done' as const }
        },
        abort: () => { cancelled = true },
      }
    },
  }
}

export default function App() {
  const chat = useChat({
    adapter: createDemoAdapter(),
    systemPrompt: 'You are a helpful assistant.',
  })

  return (
    <ChatContainer>
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} placeholder="Say something..." />
    </ChatContainer>
  )
}
```

## 切换到真实提供商

替换适配器——其余不变：

```tsx
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
```

```tsx
import { openai } from '@agentskit/adapters'

const chat = useChat({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' }),
})
```

## `data-ak-*` 属性

每个组件发出 `data-ak-*` 属性，便于在不依赖类名的情况下样式化或选择：

| 属性 | 元素 | 取值 |
|---|---|---|
| `data-ak-chat-container` | 外层 `<div>` | — |
| `data-ak-message` | 消息包装 | — |
| `data-ak-role` | 消息包装 | `user`、`assistant`、`system`、`tool` |
| `data-ak-status` | 消息包装 | `idle`、`streaming`、`done`、`error` |
| `data-ak-content` | 消息正文 | — |
| `data-ak-avatar` | 头像槽 | — |
| `data-ak-actions` | 操作槽 | — |
| `data-ak-input-bar` | 表单包装 | — |
| `data-ak-input` | textarea | — |
| `data-ak-send` | 提交按钮 | — |
| `data-ak-thinking` | 思考 div | — |
| `data-ak-markdown` | markdown 包装 | — |
| `data-ak-streaming` | markdown 包装 | 流式时为 `true` |
| `data-ak-code-block` | 代码块包装 | — |
| `data-ak-language` | 代码块包装 | 语言字符串 |
| `data-ak-copy` | 复制按钮 | — |
| `data-ak-tool-call` | 工具调用包装 | — |
| `data-ak-tool-status` | 工具调用包装 | `pending`、`running`、`done`、`error` |

完整 CSS 变量见 [Theming](./theming.md)。

## 组合

- 优先在 `ChatContainer`、`Message`、`InputBar` 外使用**小型展示包装**，而非 fork 内部实现。
- 主题令牌使用 **`data-ak-*`**；MUI/shadcn 见 [MUI Chat](../examples/mui-chat) 与 [shadcn Chat](../examples/shadcn-chat)。
- **`ToolCallView`** 与 **`Markdown`** 接受标准属性——可与路由配合处理助手内容中的深度链接。

## 生产注意

- 尽量将 **API 密钥放在服务端**（路由处理器、Server Actions）；使用 [`vercelAI`](../data-layer/adapters) 或返回流的薄 BFF。
- **`@agentskit/*` 版本**对齐到同一小版本，避免与 `core` 类型漂移。

## 故障排除

| 现象 | 可能原因 |
|---------|----------------|
| React Strict Mode 下重复消息 | 开发环境预期行为；生产应单次挂载。否则确保每个会话 id 只有一个 `useChat`。 |
| 流卡在 `streaming` | 适配器未产出 `{ type: 'done' }` 或网络挂起；调用 `stop()` 并检查适配器 `abort`。 |
| 工具从未被调用 | `description` / `schema` 较弱；模型可能忽略。收紧 schema 与系统提示。 |
| 样式缺失 | 导入 `@agentskit/react/theme` 或按 [Theming](./theming) 定义 CSS 变量。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/react`） · [Components](./components) · [Theming](./theming) · [Ink](./ink) · [@agentskit/core](../packages/core)
