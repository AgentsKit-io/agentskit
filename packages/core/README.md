# @agentskit/core

![stability: stable](https://img.shields.io/badge/stability-stable-brightgreen)

The zero-dependency foundation that every AgentsKit package builds on.

## Why

- **Start without baggage** — no external deps means it installs fast, audits clean, and works in any environment (Node, Deno, edge, browser)
- **Build your own framework** — all shared primitives, type contracts, and the chat state machine are here, ready to compose
- **Types without the weight** — import `ToolDefinition`, `SkillDefinition`, `AgentEvent`, and more without pulling in React or any adapter

## Install

```bash
npm install @agentskit/core
```

## Quick example

```ts
import { createChatController, createInMemoryMemory } from '@agentskit/core'
import { anthropic } from '@agentskit/adapters'

const controller = createChatController({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  memory: createInMemoryMemory(),
})

await controller.send('Hello!')
console.log(controller.getState().messages)
```

## Next steps

- Pass **tools** from [`@agentskit/tools`](https://www.npmjs.com/package/@agentskit/tools) into the controller config for ReAct-style tool use
- Use the same **adapter** with [`createRuntime`](https://www.npmjs.com/package/@agentskit/runtime) for headless agents, or with [`useChat`](https://www.npmjs.com/package/@agentskit/react) for a browser UI
- Add **persistence** with [`@agentskit/memory`](https://www.npmjs.com/package/@agentskit/memory) or **RAG** with [`@agentskit/rag`](https://www.npmjs.com/package/@agentskit/rag)

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM chat + embedding providers |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `createRuntime` — agents without UI |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | `useChat`, headless chat components |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Executable tools |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
