# AgentsKit

**Build AI chat, tools, and agents across React, terminal, and CLI.**

[![npm version](https://img.shields.io/npm/v/@agentskit/react)](https://www.npmjs.com/package/@agentskit/react)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/react)](https://bundlephobia.com/package/@agentskit/react)
[![license](https://img.shields.io/npm/l/@agentskit/react)](https://github.com/EmersonBraun/agentskit/blob/main/LICENSE)

[Documentation](https://emersonbraun.github.io/agentskit/) | [npm](https://www.npmjs.com/package/@agentskit/react) | [GitHub](https://github.com/EmersonBraun/agentskit)

AgentsKit is now a multi-package ecosystem with a portable core, React UI package, terminal package, adapters, and CLI. The goal stays the same: make streaming AI interfaces feel plug-and-play for humans and coding agents.

## Install

```bash
npm install @agentskit/react @agentskit/adapters
```

## Package Layout

```text
@agentskit/core           portable runtime, types, events, contracts
@agentskit/react          React hooks + UI components + theme
@agentskit/ink            terminal hooks + Ink components
@agentskit/adapters       LLM provider adapters (OpenAI, Anthropic, Gemini, etc.)
@agentskit/cli            chat + init + run commands
@agentskit/runtime        standalone agent runtime with ReAct loop
@agentskit/tools          reusable tools (web search, filesystem, shell)
@agentskit/skills         ready-made skills (researcher, coder, planner, etc.)
@agentskit/memory         persistent backends (SQLite, Redis, vectra)
@agentskit/observability  logging + tracing (console, LangSmith, OpenTelemetry)
@agentskit/rag            plug-and-play retrieval-augmented generation
@agentskit/sandbox        secure code execution (E2B, WebContainer)
@agentskit/eval           agent evaluation and benchmarking
```

## React Quick Start

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

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

That still gives you streaming, components, and a default theme out of the box.

## Ink Quick Start

```tsx
import React from 'react'
import { render } from 'ink'
import { ChatContainer, InputBar, Message, useChat } from '@agentskit/ink'

function DemoAdapter() {
  return {
    createSource: () => ({
      async *stream() {
        yield { type: 'text', content: 'Hello from AgentsKit Ink.' }
        yield { type: 'done' }
      },
      abort() {},
    }),
  }
}

function App() {
  const chat = useChat({ adapter: DemoAdapter() })
  return (
    <ChatContainer>
      {chat.messages.map(message => <Message key={message.id} message={message} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}

render(<App />)
```

## CLI Quick Start

```bash
pnpm --filter @agentskit/cli build
node packages/cli/dist/bin.js chat --provider demo
node packages/cli/dist/bin.js init --template react --dir my-agentskit-app
```

## Why AgentsKit?

| | AgentsKit | Vercel AI SDK | assistant-ui |
|---|---------|--------------|-------------|
| **API surface** | Small + portable | Full toolkit | 50+ components |
| **Setup** | React, Ink, CLI | Mostly headless | Heavy UI surface |
| **Headless** | Yes, via core | Yes | Opinionated |
| **Agent-friendly** | Entire API fits in 2K tokens | Large docs surface | Large docs surface |
| **Bundle** | Split packages | ~30KB | ~80KB |

## Swap providers in one line

```tsx
import { anthropic, openai, vercelAI, generic, gemini, ollama } from '@agentskit/adapters'

// Claude
useChat({ adapter: anthropic({ apiKey, model: 'claude-sonnet-4-6' }) })

// GPT
useChat({ adapter: openai({ apiKey, model: 'gpt-4o' }) })

// Vercel AI SDK (route handler)
useChat({ adapter: vercelAI({ api: '/api/chat' }) })

// Any ReadableStream
useChat({ adapter: generic({ send: async (msgs) => fetch('/api', { body: JSON.stringify(msgs) }).then(r => r.body!) }) })

// Gemini
useChat({ adapter: gemini({ apiKey, model: 'gemini-2.5-flash' }) })

// Ollama
useChat({ adapter: ollama({ model: 'llama3.1' }) })
```

## Official Examples

- React example app: [`apps/example-react`](apps/example-react)
- Ink example app: [`apps/example-ink`](apps/example-ink)
- Documentation site: [`apps/docs`](apps/docs)

## The entire API

### Core

```tsx
const controller = createChatController({ adapter })
const memory = createFileMemory('.agentskit-history.json')
const retriever = createStaticRetriever({ documents })
```

### React / Ink

```tsx
const chat = useChat({ adapter, memory, tools })
```

## For AI Agents

The entire API fits in **under 2,000 tokens**. See the [agent-friendly reference](https://emersonbraun.github.io/agentskit/docs/getting-started/for-ai-agents) — paste it into your LLM context and start generating chat UIs.

## Credits

Inspired by [Arrow.js](https://arrow-js.com/) — the first UI framework for the agentic era.

## License

MIT
