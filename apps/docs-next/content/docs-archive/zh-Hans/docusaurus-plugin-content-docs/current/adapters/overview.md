---
sidebar_position: 1
---

# 适配器概览

适配器将各 AI 提供商的流式 API 规范为 AgentsKit 钩子所消费的统一接口。

## 内置适配器

```tsx
import { anthropic, openai, vercelAI, generic } from '@agentskit/adapters'

// Anthropic
const adapter = anthropic({ apiKey: 'key', model: 'claude-sonnet-4-6' })

// OpenAI
const adapter = openai({ apiKey: 'key', model: 'gpt-4o' })

// Vercel AI SDK（路由处理器）
const adapter = vercelAI({ api: '/api/chat' })

// 通用（任意 ReadableStream）
const adapter = generic({
  send: async (messages) => {
    const res = await fetch('/api/chat', { body: JSON.stringify(messages) })
    return res.body
  },
})
```

## 自定义适配器

```tsx
import { createAdapter } from '@agentskit/adapters'

const myAdapter = createAdapter({
  send: async (messages) => fetch('/api', { body: JSON.stringify(messages) }),
  parse: async function* (stream) {
    const reader = stream.getReader()
    // ... yield StreamChunk objects
    yield { type: 'done' }
  },
  abort: () => { /* cleanup */ },
})
```
