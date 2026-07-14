# @agentskit/ink

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="../../apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Build terminal AI chat interfaces with the exact same API as `@agentskit/react`.

[![npm version](https://img.shields.io/npm/v/@agentskit/ink?color=blue)](https://www.npmjs.com/package/@agentskit/ink)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/ink)](https://www.npmjs.com/package/@agentskit/ink)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/ink?label=bundle)](https://bundlejs.com/?q=@agentskit/ink)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `terminal` · `cli` · `ink` · `tui` · `chat-ui`

## Verified proof

- Package metadata and tests live under `packages/ink/`.
- Package guide: https://www.agentskit.io/docs/packages/ink
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/ink turns AgentsKit agents into polished terminal experiences for CLIs, internal tools, and developer workflows.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/ink) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why ink

- **No context switching** — if you know `@agentskit/react`, you already know this; same hooks, same component names, different renderer
- **Real terminal UX** — keyboard navigation, ANSI colors, and proper TTY streaming so your CLI feels native, not like a web app in a box
- **Any local or cloud model** — pair with Ollama for fully offline CLI tools, or any other provider via `@agentskit/adapters`
- **Full parity with the React package** — tools, memory, and skills all work the same way; one codebase, two surfaces

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/ink @agentskit/adapters
```

## Quick example

<!-- readme-example:quickstart -->
```tsx
import React from 'react'
import { render } from 'ink'
import { ChatContainer, InputBar, Message, useChat } from '@agentskit/ink'
import { ollama } from '@agentskit/adapters'

function App() {
  const chat = useChat({ adapter: ollama({ model: 'llama3.1' }) })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}

render(<App />)
```

## Features

- `useChat` hook — identical API to `@agentskit/react`
- Terminal components: `ChatContainer`, `Message`, `InputBar`, `ToolCallView`
- Keyboard navigation and auto-scroll
- ANSI theming
- Default file-based memory out of the box

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | Browser — same hooks, different renderer |
| [@agentskit/cli](https://www.npmjs.com/package/@agentskit/cli) | Interactive chat + `agentskit init` |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | Providers (e.g. `ollama` for local models) |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | Shared chat types and controller |

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
- Published as `@agentskit/ink`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
