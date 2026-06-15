# @agentskit/react

Add streaming AI chat to any React app in 10 lines of code.

[![npm version](https://img.shields.io/npm/v/@agentskit/react?color=blue)](https://www.npmjs.com/package/@agentskit/react)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/react)](https://www.npmjs.com/package/@agentskit/react)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/react?label=bundle)](https://bundlejs.com/?q=@agentskit/react)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `claude` · `gemini` · `chatgpt` · `react` · `react-hooks` · `chat-ui` · `ai-agents`

## Why react

- **Ship faster** — streaming chat with tool calls, memory, and markdown rendering works out of the box, no wiring required
- **Works with your design system** — completely headless; style it with Tailwind, MUI, shadcn, or plain CSS via `data-ak-*` attributes
- **Agent-ready by default** — built-in support for tool calls, thinking indicators, and multi-turn memory so you never hit a wall as your product grows
- **Swap providers in one line** — pass any adapter from `@agentskit/adapters`; your component code never changes

## Install

```bash
npm install @agentskit/react @agentskit/adapters
```

## Quick example

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

## Features

- `useChat` hook — streaming, abort, tool calls, memory, and skills in one API
- Headless components: `ChatContainer`, `Message`, `InputBar`, `ToolCallView`, `ThinkingIndicator`
- `data-ak-*` attributes for styling — zero hardcoded styles, full design-system control
- Theme via `@agentskit/react/theme` — opt-in CSS variables, override per component
- Works with React 18 and 19

## Other framework bindings (same contract)

Every binding exposes the same `ChatReturn` surface. Pick the one for your stack:

| Package | API |
|---------|-----|
| [@agentskit/vue](https://www.npmjs.com/package/@agentskit/vue) | `useChat` composable + `ChatContainer` component |
| [@agentskit/svelte](https://www.npmjs.com/package/@agentskit/svelte) | `createChatStore` — Svelte 5 store |
| [@agentskit/solid](https://www.npmjs.com/package/@agentskit/solid) | `useChat` hook (Solid `createStore`) |
| [@agentskit/react-native](https://www.npmjs.com/package/@agentskit/react-native) | `useChat` (Metro / Hermes safe) |
| [@agentskit/angular](https://www.npmjs.com/package/@agentskit/angular) | `AgentskitChat` service (Signal + RxJS) |
| [@agentskit/ink](https://www.npmjs.com/package/@agentskit/ink) | Terminal `useChat` + components |

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Chat controller types, events |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | `anthropic`, `openai`, `ollama`, … |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Same stack without a browser |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Tool definitions for `useChat` |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
