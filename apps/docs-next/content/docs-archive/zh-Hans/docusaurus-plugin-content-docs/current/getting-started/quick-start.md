---
sidebar_position: 2
---

# 快速开始

不到 10 行代码搭建可用的 AI 聊天。

## 基础聊天

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

function App() {
  const chat = useChat({
    adapter: anthropic({ apiKey: 'your-key', model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

## 试用官方示例

- React 应用：`apps/example-react`
- Ink 应用：`apps/example-ink`
- CLI：`node packages/cli/dist/bin.js chat --provider demo`

## 发生了什么？

1. **`useChat`** 创建连接到 AI 适配器的聊天会话
2. **`ChatContainer`** 提供可滚动布局，新消息时自动滚动到底部
3. **`Message`** 渲染每条消息并支持流式输出
4. **`InputBar`** 处理文本输入并在 Enter 时发送

## 使用其他提供商

替换适配器——其余不变：

```tsx
import { openai } from '@agentskit/adapters'

const chat = useChat({
  adapter: openai({ apiKey: 'your-key', model: 'gpt-4o' }),
})
```

## 无头模式

跳过主题导入，自行样式化：

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
// No theme import — components render with data-ak-* attributes only

function App() {
  const chat = useChat({ adapter: myAdapter })
  return (
    <ChatContainer className="my-chat">
      {chat.messages.map(msg => (
        <Message key={msg.id} message={msg} />
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```
