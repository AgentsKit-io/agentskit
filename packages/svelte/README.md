# @agentskit/svelte

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

Svelte 5 store + headless chat components. Same `ChatReturn` contract every AgentsKit framework binding ships — swap frameworks without changing your agent.

[![npm version](https://img.shields.io/npm/v/@agentskit/svelte?color=blue)](https://www.npmjs.com/package/@agentskit/svelte)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/svelte)](https://www.npmjs.com/package/@agentskit/svelte)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/svelte?label=bundle)](https://bundlejs.com/?q=@agentskit/svelte)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `svelte` · `svelte5` · `runes` · `chat` · `streaming`

## Why

- **One contract, every framework** — `createChatStore` returns the exact same shape as the React / Vue / Solid / Angular / RN / Ink bindings.
- **Svelte 5 runes** — reactive state without subscriptions; drops into `.svelte` files natively.
- **Headless by default** — components emit `data-ak-*` attributes; style however you want.
- **Streaming, tools, HITL** — all core features work identically to `@agentskit/react`.

## Install

```bash
npm install @agentskit/svelte @agentskit/adapters
```

Peers: `svelte ^5`.

## Quick example

```svelte
<script lang="ts">
  import { createChatStore } from '@agentskit/svelte'
  import { anthropic } from '@agentskit/adapters'

  const chat = createChatStore({
    adapter: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  })
</script>

<div data-ak-chat>
  {#each $chat.messages as m (m.id)}
    <p data-ak-role={m.role}>{m.content}</p>
  {/each}
  <form on:submit|preventDefault={() => chat.send($chat.input)}>
    <input value={$chat.input} on:input={(e) => chat.setInput(e.currentTarget.value)} />
  </form>
</div>
```

`createChatStore` returns a `Readable<ChatState>` — subscribe with `$chat` for
state; call actions (`chat.send(...)`) directly on the store object.

## API

- `createChatStore(config)` — returns a `Readable<ChatState>` (`$chat.messages`, `$chat.status`, `$chat.input`) plus actions `send(text)`, `setInput(v)`, `stop`, `retry`, `clear`, `approve`, `deny`, `edit`, `regenerate`, `destroy`.
- Headless components at parity with `@agentskit/react` (Svelte 5, `data-ak-*` only): `ChatContainer`, `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`, `ToolConfirmation`.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ChatReturn` contract |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM providers |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Built-in + integration tools |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Chat + vector backends |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) · [vue](https://www.npmjs.com/package/@agentskit/vue) · [solid](https://www.npmjs.com/package/@agentskit/solid) · [react-native](https://www.npmjs.com/package/@agentskit/react-native) · [angular](https://www.npmjs.com/package/@agentskit/angular) · [ink](https://www.npmjs.com/package/@agentskit/ink) | Same contract, different host |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io/docs/packages/svelte) · [GitHub](https://github.com/AgentsKit-io/agentskit)
