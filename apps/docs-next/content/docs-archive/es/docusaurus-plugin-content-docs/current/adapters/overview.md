---
sidebar_position: 1
---

# Descripción general de adaptadores

Los adaptadores normalizan las APIs de streaming de proveedores de IA en una interfaz común que consumen los hooks de AgentsKit.

## Adaptadores integrados

```tsx
import { anthropic, openai, vercelAI, generic } from '@agentskit/adapters'

// Anthropic
const adapter = anthropic({ apiKey: 'key', model: 'claude-sonnet-4-6' })

// OpenAI
const adapter = openai({ apiKey: 'key', model: 'gpt-4o' })

// Vercel AI SDK (route handler)
const adapter = vercelAI({ api: '/api/chat' })

// Generic (any ReadableStream)
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
