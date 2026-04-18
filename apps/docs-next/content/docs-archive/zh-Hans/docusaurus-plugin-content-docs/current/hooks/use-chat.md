---
sidebar_position: 3
---

# useChat

高层聊天会话编排器。管理消息、流式输出与输入状态。

## 用法

```tsx
import { useChat } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'

function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: 'key', model: 'claude-sonnet-4-6' }),
    onMessage: (msg) => console.log('Received:', msg.content),
  })

  return (
    <div>
      {chat.messages.map(msg => (
        <div key={msg.id}>{msg.role}: {msg.content}</div>
      ))}
      <input value={chat.input} onChange={e => chat.setInput(e.target.value)} />
      <button onClick={() => chat.send(chat.input)}>Send</button>
      {chat.status === 'streaming' && <button onClick={chat.stop}>Stop</button>}
    </div>
  )
}
```

## API

```ts
const chat = useChat(config)
```

### 配置

| 参数 | 类型 | 说明 |
|-------|------|-------------|
| `adapter` | `AdapterFactory` | AI 提供商适配器 |
| `onMessage` | `(msg: Message) => void` | 助手消息完成时调用 |
| `onError` | `(err: Error) => void` | 流错误时调用 |
| `initialMessages` | `Message[]` | 预填充聊天历史 |

### 返回值

| 字段 | 类型 | 说明 |
|-------|------|-------------|
| `messages` | `Message[]` | 会话中全部消息 |
| `send` | `(text: string) => void` | 发送用户消息并流式返回响应 |
| `stop` | `() => void` | 中止当前流 |
| `retry` | `() => void` | 重试上一条助手消息 |
| `status` | `StreamStatus` | 当前流式状态 |
| `input` | `string` | 当前输入值 |
| `setInput` | `(value: string) => void` | 更新输入值 |
