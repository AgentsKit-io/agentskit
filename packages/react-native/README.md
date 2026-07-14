# @agentskit/react-native

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="../../apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

React Native / Expo hook + headless chat components. Metro-safe (no DOM deps). Same `ChatReturn` contract every AgentsKit framework binding ships.

[![npm version](https://img.shields.io/npm/v/@agentskit/react-native?color=blue)](https://www.npmjs.com/package/@agentskit/react-native)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/react-native)](https://www.npmjs.com/package/@agentskit/react-native)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/react-native?label=bundle)](https://bundlejs.com/?q=@agentskit/react-native)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `react-native` · `expo` · `mobile` · `chat` · `streaming`

## Verified proof

- Package metadata and tests live under `packages/react-native/`.
- Package guide: https://www.agentskit.io/docs/packages/react-native
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/react-native brings the same AgentsKit chat contract to Expo and React Native mobile apps.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/react-native) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why

- **One contract, every framework** — `useChat` returns the exact same shape as the web React / Vue / Svelte / Solid / Angular / Ink bindings.
- **Metro-safe** — no DOM APIs; works on iOS, Android, and Expo out of the box.
- **Native components** — `<ChatContainer>` wraps `ScrollView`, `<InputBar>` wraps `TextInput`; 8 headless components at full parity with `@agentskit/react`.
- **Streaming, tools, HITL** — all core features work identically to `@agentskit/react`.

### Headless on React Native

React Native has no DOM, so there are no `data-ak-*` attributes. The web-parity story is carried by **`testID`** props (`ak-message`, `ak-input`, `ak-send`, …): the same stable hooks the web components expose via `data-ak-*`, surfaced through RN's native `testID` (Appium / e2e). Role and status are conveyed via `accessibilityLabel`. No `StyleSheet`/colors are baked in — use `style` for wrappers, `Message.contentStyle` for message text, and `InputBar.inputStyle` for composer text.

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/react-native @agentskit/adapters
```

Peers: `react`, `react-native`.

## Quick example

<!-- readme-example:quickstart -->
```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react-native'
import { anthropic } from '@agentskit/adapters'

export function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  })

  return (
    <ChatContainer>
      {chat.messages.map((m) => <Message key={m.id} message={m} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
```

## API

- `useChat(config)` — hook returning `ChatReturn` (DOM-free, `useSyncExternalStore`).
- Headless components (RN primitives, `testID`-keyed):
  - `ChatContainer` — `ScrollView` wrapper with auto-scroll to end.
  - `Message` — `message` prop → `View` + `Text`; role/status via `accessibilityLabel`.
  - `InputBar` — `chat: ChatReturn` → `TextInput` + Send `Pressable`; sends on submit, disabled while empty or streaming.
  - `Markdown` — `content` + `streaming` → `Text`.
  - `CodeBlock` — `code`, `language`, `copyable`, `onCopy` → `View` + `Text` + optional copy `Pressable`.
  - `ToolCallView` — `toolCall`; collapsible details via a toggle `Pressable`.
  - `ThinkingIndicator` — `visible` + `label`; renders `null` when not visible.
  - `ToolConfirmation` — `toolCall`, `onApprove`, `onDeny`; renders `null` unless `status === 'requires_confirmation'`.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ChatReturn` contract |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM providers |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Built-in + integration tools |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Chat + vector backends |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) · [vue](https://www.npmjs.com/package/@agentskit/vue) · [svelte](https://www.npmjs.com/package/@agentskit/svelte) · [solid](https://www.npmjs.com/package/@agentskit/solid) · [angular](https://www.npmjs.com/package/@agentskit/angular) · [ink](https://www.npmjs.com/package/@agentskit/ink) | Same contract, different host |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io/docs/packages/react-native) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/react-native`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
