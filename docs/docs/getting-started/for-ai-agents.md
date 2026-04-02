---
sidebar_position: 3
---

# For AI Agents

The entire React Arrow API in one page. Paste this into your LLM context.

## Hooks

```tsx
// Stream any async source
const { text, status, error, stop } = useStream(source)

// Reactive state (proxy-based, minimal re-renders)
const state = useReactive({ count: 0 })
state.count++ // triggers re-render

// Full chat session
const chat = useChat({ adapter })
chat.send('message')    // send and stream response
chat.stop()             // abort stream
chat.retry()            // retry last
chat.messages           // Message[]
chat.status             // 'idle' | 'streaming' | 'error'
chat.input / setInput   // controlled input
```

## Adapters

```tsx
import { anthropic, openai, vercelAI, generic } from 'react-arrow/adapters'

anthropic({ apiKey, model })
openai({ apiKey, model })
vercelAI({ api: '/api/chat' })
generic({ send: async (msgs) => ReadableStream })
```

## Components

```tsx
<ChatContainer>         {/* scrollable chat layout */}
<Message message={m} /> {/* chat bubble */}
<InputBar chat={chat} /> {/* input + send */}
<Markdown content={s} /> {/* markdown text */}
<CodeBlock code={s} language="ts" copyable />
<ToolCallView toolCall={tc} />
<ThinkingIndicator visible />
```

## Theme

```tsx
import 'react-arrow/theme' // optional default CSS
```

All components use `data-ra-*` attributes. Override with CSS custom properties (`--ra-color-*`, `--ra-font-*`, `--ra-spacing-*`).

## Types

```ts
Message { id, role, content, status, toolCalls?, metadata?, createdAt }
ToolCall { id, name, args, result?, status }
StreamChunk { type: 'text'|'tool_call'|'error'|'done', content?, toolCall? }
```
