# @agentskit/react

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Add streaming AI chat to any React app in 10 lines of code.

[![npm version](https://img.shields.io/npm/v/@agentskit/react?color=blue)](https://www.npmjs.com/package/@agentskit/react)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/react)](https://www.npmjs.com/package/@agentskit/react)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/react?label=bundle)](https://bundlejs.com/?q=@agentskit/react)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `claude` · `gemini` · `chatgpt` · `react` · `react-hooks` · `chat-ui` · `ai-agents`

## Verified proof

- Package metadata and tests live under `packages/react/`.
- Package guide: https://www.agentskit.io/docs/packages/react
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/react is the React UI layer: hooks and headless components for streaming chat, tool calls, memory, and agent-facing interfaces.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/react) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why react

- **Ship faster** — streaming chat with tool calls, memory, and markdown rendering works out of the box, no wiring required
- **Works with your design system** — completely headless; style it with Tailwind, MUI, shadcn, or plain CSS via `data-ak-*` attributes
- **Agent-ready by default** — built-in support for tool calls, thinking indicators, and multi-turn memory so you never hit a wall as your product grows
- **Swap providers in one line** — pass any adapter from `@agentskit/adapters`; your component code never changes

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/react @agentskit/adapters
```

## Quick example

<!-- readme-example:quickstart -->
```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

export function Chat() {
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
- `InputBar` blocks form submit and Enter while `chat.status === 'streaming'` (and when `disabled`)
- `ToolCallView` toggle exposes `aria-expanded` for assistive tech
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

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/react`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
