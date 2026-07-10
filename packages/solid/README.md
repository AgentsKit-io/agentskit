# @agentskit/solid

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

SolidJS hook + headless chat components. Same `ChatReturn` contract every AgentsKit framework binding ships — swap frameworks without changing your agent.

[![npm version](https://img.shields.io/npm/v/@agentskit/solid?color=blue)](https://www.npmjs.com/package/@agentskit/solid)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/solid)](https://www.npmjs.com/package/@agentskit/solid)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/solid?label=bundle)](https://bundlejs.com/?q=@agentskit/solid)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `solid` · `solidjs` · `signals` · `chat` · `streaming`

## Why

- **One contract, every framework** — `useChat` returns the exact same shape as the React / Vue / Svelte / Angular / RN / Ink bindings.
- **Fine-grained reactivity** — values surface as Solid accessors; no diff, no rerender overhead.
- **Headless by default** — components emit `data-ak-*` attributes; style however you want.
- **Streaming, tools, HITL** — all core features work identically to `@agentskit/react`.

## Install

```bash
npm install @agentskit/solid @agentskit/adapters
```

Peers: `solid-js ^1.8`.

## Quick example

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/solid'
import { For } from 'solid-js'
import { anthropic } from '@agentskit/adapters'

export function App() {
  const chat = useChat({
    adapter: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      <For each={chat.messages}>{(m) => <Message message={m} />}</For>
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

State surfaces through a reactive proxy — read `chat.messages` / `chat.input` directly inside JSX.

## API

- `useChat(config)` — hook returning `ChatReturn` via a reactive proxy: `messages`, `status`, `input` + actions `send(text)`, `setInput(v)`, `stop`, `retry`, `clear`, `approve`, `deny`, `edit`, `regenerate`.
- Headless components — emit `data-ak-*` attributes only, no styling. Full parity with `@agentskit/react`:
  - `ChatContainer` — scroll wrapper, auto-scrolls on new content.
  - `Message` — renders a message; optional `avatar` / `actions` slots.
  - `InputBar` — textarea + Send; Enter submits, Shift+Enter newlines, disabled while empty/streaming.
  - `Markdown` — content surface with a `streaming` flag.
  - `CodeBlock` — `code` + `language`, optional `copyable` copy button.
  - `ToolCallView` — collapsible tool-call view (name → args/result).
  - `ThinkingIndicator` — shown while `visible`, with a `label`.
  - `ToolConfirmation` — HITL approve/deny, renders only when `status === 'requires_confirmation'`.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ChatReturn` contract |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM providers |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Built-in + integration tools |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Chat + vector backends |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) · [vue](https://www.npmjs.com/package/@agentskit/vue) · [svelte](https://www.npmjs.com/package/@agentskit/svelte) · [react-native](https://www.npmjs.com/package/@agentskit/react-native) · [angular](https://www.npmjs.com/package/@agentskit/angular) · [ink](https://www.npmjs.com/package/@agentskit/ink) | Same contract, different host |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io/docs/packages/solid) · [GitHub](https://github.com/AgentsKit-io/agentskit)
