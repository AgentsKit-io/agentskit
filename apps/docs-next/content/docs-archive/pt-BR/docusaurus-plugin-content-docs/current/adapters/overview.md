---
sidebar_position: 1
---

# Visão geral dos adaptadores

Adaptadores normalizam APIs de streaming dos provedores de IA numa interface comum consumida pelos hooks do AgentsKit.

## Adaptadores embutidos

```tsx
import { anthropic, openai, vercelAI, generic } from '@agentskit/adapters'

// Anthropic
const adapter = anthropic({ apiKey: 'key', model: 'claude-sonnet-4-6' })

// OpenAI
const adapter = openai({ apiKey: 'key', model: 'gpt-4o' })

// Vercel AI SDK (route handler)
const adapter = vercelAI({ api: '/api/chat' })

// Generic (qualquer ReadableStream)
const adapter = generic({
  send: async (messages) => {
    const res = await fetch('/api/chat', { body: JSON.stringify(messages) })
    return res.body
  },
})
```

## Adaptadores personalizados

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
