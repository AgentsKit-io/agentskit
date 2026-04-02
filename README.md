# AgentKit

**Ship AI chat in 10 lines of React.**

[![npm version](https://img.shields.io/npm/v/@agentkit/react)](https://www.npmjs.com/package/@agentkit/react)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentkit/react)](https://bundlephobia.com/package/@agentkit/react)
[![license](https://img.shields.io/npm/l/@agentkit/react)](https://github.com/EmersonBraun/agentkit/blob/main/LICENSE)

Drop-in hooks and components for streaming AI interfaces. Works with **Claude**, **GPT**, **Vercel AI SDK**, or any LLM. So simple an AI agent can write it for you.

## Install

```bash
npm install @agentkit/react
```

## 10-Line Chat

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { anthropic } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: 'your-key', model: 'claude-sonnet-4-6' }),
  })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

That's it. Streaming, auto-scroll, keyboard handling, light/dark theme — all included.

## Why AgentKit?

| | AgentKit | Vercel AI SDK | assistant-ui |
|---|---------|--------------|-------------|
| **API surface** | 3 hooks | Full toolkit | 50+ components |
| **Setup** | 10 lines | ~30 lines | ~50 lines |
| **Headless** | Yes | No UI included | Opinionated |
| **Agent-friendly** | Entire API fits in 2K tokens | Large docs surface | Large docs surface |
| **Bundle** | <5KB | ~30KB | ~80KB |

## Swap providers in one line

```tsx
import { anthropic, openai, vercelAI, generic } from '@agentkit/react/adapters'

// Claude
useChat({ adapter: anthropic({ apiKey, model: 'claude-sonnet-4-6' }) })

// GPT
useChat({ adapter: openai({ apiKey, model: 'gpt-4o' }) })

// Vercel AI SDK (route handler)
useChat({ adapter: vercelAI({ api: '/api/chat' }) })

// Any ReadableStream
useChat({ adapter: generic({ send: async (msgs) => fetch('/api', { body: JSON.stringify(msgs) }).then(r => r.body!) }) })
```

## Works everywhere

### Next.js (App Router)

```tsx
// app/chat/page.tsx
'use client'
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { anthropic } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

export default function ChatPage() {
  const chat = useChat({ adapter: anthropic({ apiKey: process.env.NEXT_PUBLIC_API_KEY!, model: 'claude-sonnet-4-6' }) })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

### Vite

```tsx
// src/App.tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { openai } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

function App() {
  const chat = useChat({ adapter: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY, model: 'gpt-4o' }) })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

### Remix

```tsx
// app/routes/chat.tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { vercelAI } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

export default function Chat() {
  const chat = useChat({ adapter: vercelAI({ api: '/api/chat' }) })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

### TanStack Start

```tsx
// src/routes/chat.tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { anthropic } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

export default function Chat() {
  const chat = useChat({ adapter: anthropic({ apiKey: 'your-key', model: 'claude-sonnet-4-6' }) })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

## The entire API

### 3 Hooks

```tsx
// Stream any async source
const { text, status, error, stop } = useStream(source)

// Reactive state (proxy-based, minimal re-renders)
const state = useReactive({ count: 0 })

// Full chat session
const chat = useChat({ adapter })
```

### 7 Components

```tsx
<ChatContainer>         {/* scrollable chat layout */}
<Message message={m} /> {/* chat bubble with streaming */}
<InputBar chat={chat} /> {/* input + send */}
<Markdown content={s} /> {/* markdown renderer */}
<CodeBlock code={s} language="ts" copyable />
<ToolCallView toolCall={tc} />
<ThinkingIndicator visible />
```

### Headless + Optional Theme

Components ship unstyled with `data-ak-*` attributes. Import the theme for instant polish:

```tsx
import '@agentkit/react/theme' // light/dark, CSS custom properties
```

Override any token:

```css
:root {
  --ak-color-bubble-user: #10b981;
  --ak-radius: 16px;
}
```

## For AI Agents

The entire API fits in **under 2,000 tokens**. See the [agent-friendly reference](https://emersonbraun.github.io/agentkit/docs/getting-started/for-ai-agents) — paste it into your LLM context and start generating chat UIs.

## Credits

Inspired by [Arrow.js](https://arrow-js.com/) — the first UI framework for the agentic era.

## License

MIT
