# @agentskit/vue

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="../../apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Vue 3 composable + headless chat components. Same `ChatReturn` contract every AgentsKit framework binding ships — swap frameworks without changing your agent.

[![npm version](https://img.shields.io/npm/v/@agentskit/vue?color=blue)](https://www.npmjs.com/package/@agentskit/vue)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/vue)](https://www.npmjs.com/package/@agentskit/vue)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/vue?label=bundle)](https://bundlejs.com/?q=@agentskit/vue)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `vue` · `vue3` · `composable` · `chat` · `streaming`

## Verified proof

- Package metadata and tests live under `packages/vue/`.
- Package guide: https://www.agentskit.io/docs/packages/vue
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/vue brings the shared AgentsKit chat contract to Vue 3 with composables, streaming, tools, memory, and headless components.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/vue) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why

- **One contract, every framework** — `useChat` returns the exact same shape as the React / Svelte / Solid / Angular / RN / Ink bindings.
- **Composition API native** — values surface as `ref`s; drops into `<script setup>` with zero glue.
- **Headless by default** — components emit `data-ak-*` attributes; bring your own styling.
- **Streaming, tools, HITL** — all core features work identically to `@agentskit/react`.

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/vue @agentskit/adapters
```

Peers: `vue ^3.4`.

## Quick example

```vue
<script setup lang="ts">
import { useChat } from '@agentskit/vue'
import { anthropic } from '@agentskit/adapters'

const chat = useChat({
  adapter: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
})
</script>

<template>
  <div data-ak-chat>
    <p v-for="m in chat.messages" :key="m.id" :data-ak-role="m.role">{{ m.content }}</p>
    <form @submit.prevent="chat.send(chat.input)">
      <input
        :value="chat.input"
        :disabled="chat.status === 'streaming'"
        @input="(e) => chat.setInput((e.target as HTMLInputElement).value)"
      />
    </form>
  </div>
</template>
```

State is `reactive` — read `chat.messages` / `chat.input` directly (no `.value`).

## API

- `useChat(config)` — composable returning `ChatReturn`: reactive `messages`, `status`, `input`, `error`, `usage` + actions `send(text)`, `setInput(v)`, `stop`, `retry`, `clear`, `approve`, `deny`, `edit`, `regenerate`.
- `<ChatRoot>` — controller-free `data-ak-chat` root with a default slot for application shells that already use `useChat`.
- `<ChatContainer :config>` — batteries-included headless container.
- Headless primitives at parity with `@agentskit/react`: `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`, `ToolConfirmation` — each emits `data-ak-*` only.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ChatReturn` contract |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM providers |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Built-in + integration tools |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Chat + vector backends |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) · [svelte](https://www.npmjs.com/package/@agentskit/svelte) · [solid](https://www.npmjs.com/package/@agentskit/solid) · [react-native](https://www.npmjs.com/package/@agentskit/react-native) · [angular](https://www.npmjs.com/package/@agentskit/angular) · [ink](https://www.npmjs.com/package/@agentskit/ink) | Same contract, different host |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io/docs/packages/vue) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Quick start

<!-- readme-example:quickstart -->
```ts
import '@agentskit/vue'
console.log('@agentskit/vue loaded')
```

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/vue`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
