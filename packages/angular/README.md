# @agentskit/angular

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Angular 18+ service (Signal + RxJS) + headless chat components. Same `ChatReturn` contract every AgentsKit framework binding ships.

[![npm version](https://img.shields.io/npm/v/@agentskit/angular?color=blue)](https://www.npmjs.com/package/@agentskit/angular)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/angular)](https://www.npmjs.com/package/@agentskit/angular)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/angular?label=bundle)](https://bundlejs.com/?q=@agentskit/angular)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `angular` · `signals` · `rxjs` · `chat` · `streaming`

## Verified proof

- Package metadata and tests live under `packages/angular/`.
- Package guide: https://www.agentskit.io/docs/packages/angular
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/angular brings the shared AgentsKit chat contract to Angular with Signals, RxJS, streaming, tools, and memory.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/angular) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why

- **One contract, every framework** — `AgentskitChat` service surfaces the exact same shape as the React / Vue / Svelte / Solid / RN / Ink bindings.
- **Angular-native reactivity** — state exposed as `Signal`; events as RxJS `Observable`.
- **Headless by default** — components emit `data-ak-*` attributes; style with your design system.
- **Streaming, tools, HITL** — all core features work identically to `@agentskit/react`.

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/angular @agentskit/adapters
```

Peers: `@angular/core ^18 || ^19 || ^20 || ^21`, `rxjs ^7`.

## Quick example

<!-- readme-example:quickstart -->
```ts
import { Component, inject } from '@angular/core'
import { AgentskitChat, ChatContainerComponent, MessageComponent } from '@agentskit/angular'
import { anthropic } from '@agentskit/adapters'

@Component({
  standalone: true,
  imports: [ChatContainerComponent, MessageComponent],
  template: `
    <ak-chat-container>
      @for (m of chat.state()?.messages ?? []; track m.id) {
        <ak-message [message]="m" />
      }
    </ak-chat-container>
    <form (submit)="$event.preventDefault(); chat.send(chat.state()?.input ?? '')">
      <input [value]="chat.state()?.input ?? ''" (input)="chat.setInput($any($event.target).value)" />
    </form>
  `,
})
export class ChatWidget {
  protected readonly chat = inject(AgentskitChat)

  constructor() {
    this.chat.init({
      adapter: anthropic({ apiKey: process.env['NG_APP_ANTHROPIC_API_KEY']!, model: 'claude-sonnet-4-6' }),
    })
  }
}
```

Published as **partial-Ivy AOT** via `ng-packagr` (APF FESM2022 + `.d.ts`, ESM-only).
Works in AOT production apps — no JIT-only caveat. The package intentionally
does not ship dual CJS; Angular Package Format is ESM.

`init(config)` wires the controller and returns a `ChatReturn` snapshot; read live
state from the `state` `Signal` (`chat.state()`) or the `stream$` `Observable`.
Async actions return the underlying controller Promises. Call `destroy()` (or rely
on `ngOnDestroy`) to unsubscribe + stop; both are idempotent and safe to re-init.

## API

- `AgentskitChat` service — DI-friendly. `init(config)` returns a `ChatReturn` snapshot and starts the session; `state: Signal<ChatState | null>` and `stream$: Observable<ChatState | null>` expose live state. Full action surface: `send(text)`, `setInput(v)`, `stop`, `retry`, `clear`, `approve`, `deny(id, reason?)`, `edit`, `regenerate`, `proposeToolCall`, `destroy`.
- Headless standalone components at parity with `@agentskit/react` (`data-ak-*` only): `ChatContainerComponent` (`<ak-chat-container>`), `MessageComponent`, `InputBarComponent`, `MarkdownComponent`, `CodeBlockComponent`, `ToolCallViewComponent`, `ThinkingIndicatorComponent`, `ToolConfirmationComponent`.

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `ChatReturn` contract |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | LLM providers |
| [@agentskit/tools](https://www.npmjs.com/package/@agentskit/tools) | Built-in + integration tools |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Chat + vector backends |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) · [vue](https://www.npmjs.com/package/@agentskit/vue) · [svelte](https://www.npmjs.com/package/@agentskit/svelte) · [solid](https://www.npmjs.com/package/@agentskit/solid) · [react-native](https://www.npmjs.com/package/@agentskit/react-native) · [ink](https://www.npmjs.com/package/@agentskit/ink) | Same contract, different host |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io/docs/packages/angular) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/angular`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
