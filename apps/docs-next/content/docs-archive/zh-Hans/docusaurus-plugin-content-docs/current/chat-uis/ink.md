---
sidebar_position: 2
---

# @agentskit/ink

使用 [Ink](https://github.com/vadimdemedes/ink) 构建的终端聊天 UI。与 `@agentskit/react` 使用相同的 [`@agentskit/core`](../packages/core) 控制器，因此聊天逻辑一致——仅渲染器不同。

## 何时使用

- **类 CLI** 或适合 SSH 的聊天，无需浏览器。
- 希望与 React 版 [`useChat`](../hooks/use-chat) 行为一致，但使用终端渲染。

网页请用 [`@agentskit/react`](./react)；零代码终端聊天请用 [`CLI`](../infrastructure/cli)。

## 安装

```bash
npm install @agentskit/ink @agentskit/core ink react
# optional: real AI providers
npm install @agentskit/adapters
```

## 钩子

### `useChat`

与 `@agentskit/react` 的 `useChat` API 相同。返回相同的 `ChatReturn` 对象。

```tsx
import { useChat } from '@agentskit/ink'

const chat = useChat({
  adapter: myAdapter,
  systemPrompt: 'You are...',
})
```

完整返回类型见 [`useChat` 参考](../hooks/use-chat.md)。

## 完整示例（演示适配器——无需 API 密钥）

```tsx
import React from 'react'
import { render, Box, Text } from 'ink'
import {
  ChatContainer,
  Message,
  InputBar,
  ThinkingIndicator,
  useChat,
} from '@agentskit/ink'
import type { AdapterFactory } from '@agentskit/ink'

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
            await new Promise(r => setTimeout(r, 45))
            yield { type: 'text' as const, content: chunk }
          }
          yield { type: 'done' as const }
        },
        abort: () => { cancelled = true },
      }
    },
  }
}

function App() {
  const chat = useChat({
    adapter: createDemoAdapter(),
    systemPrompt: 'You are a helpful terminal assistant.',
  })

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">AgentsKit Terminal Chat</Text>
      <ChatContainer>
        {chat.messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </ChatContainer>
      <ThinkingIndicator visible={chat.status === 'streaming'} />
      <InputBar chat={chat} placeholder="Type and press Enter..." />
    </Box>
  )
}

render(<App />)
```

## 切换到真实提供商

```tsx
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
```

## 键盘导航

`InputBar` 使用 Ink 的 `useInput`。以下按键会自动处理：

| 按键 | 行为 |
|---|---|
| 任意字符 | 追加到输入 |
| `Enter` | 发送消息 |
| `Backspace` / `Delete` | 删除最后一个字符 |
| `Ctrl+C` | 退出（Ink 默认） |

`chat.status === 'streaming'` 时禁用输入。

## 终端颜色

`Message` 通过 Ink 的 `color` 为每个角色固定颜色：

| 角色 | 颜色 |
|---|---|
| `assistant` | `cyan` |
| `user` | `green` |
| `system` | `yellow` |
| `tool` | `magenta` |

`ToolCallView` 在圆角框内用洋红文字渲染。`ThinkingIndicator` 用黄色渲染。

## 与 @agentskit/react 的差异

| 功能 | `@agentskit/react` | `@agentskit/ink` |
|---|---|---|
| 渲染器 | DOM | Ink（终端） |
| 主题 / CSS | `data-ak-*` + CSS 变量 | 终端颜色 |
| `Markdown` 组件 | 有 | 无 |
| `CodeBlock` 组件 | 有 | 无 |
| `useStream` 钩子 | 有 | 无 |
| `useReactive` 钩子 | 有 | 无 |
| `InputBar` 多行 | Shift+Enter | 无（单行） |

## 故障排除

| 问题 | 缓解措施 |
|-------|------------|
| 原始模式 / 按键异常 | 确保 stdout 为 TTY；调试输入时避免管道。 |
| 布局溢出 | 窄终端会截断长行；系统提示更短或使用外部分页器查看大块输出。 |
| 缺少钩子 | `useStream` / `useReactive` **未**打包进 Ink——仅在存在这些钩子的地方适用 `@agentskit/react` 的导入方式。 |

## 另请参阅

[从这里开始](../getting-started/read-this-first) · [软件包](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/)（`@agentskit/ink`） · [React](./react) · [Components](./components) · [@agentskit/core](../packages/core)
