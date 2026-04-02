---
sidebar_position: 2
---

# Quick Start

Build a working AI chat in under 10 lines.

## Basic Chat

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { anthropic } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

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

## What's happening?

1. **`useChat`** creates a chat session connected to an AI adapter
2. **`ChatContainer`** provides a scrollable layout that auto-scrolls on new messages
3. **`Message`** renders each message with streaming support
4. **`InputBar`** handles text input and sends messages on Enter

## Using a different provider

Swap the adapter — everything else stays the same:

```tsx
import { openai } from '@agentkit/react/adapters'

const chat = useChat({
  adapter: openai({ apiKey: 'your-key', model: 'gpt-4o' }),
})
```

## Headless mode

Skip the theme import and style everything yourself:

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
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
