# @agentskit/statechart

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Deterministic, serializable interaction state for [AgentsKit](https://www.agentskit.io) applications. It is framework-neutral and has zero runtime dependencies.

## Why

Interactive agent experiences often need explicit states such as waiting for input, confirming an action, or completing a task. This package gives every UI binding and host the same small transition and snapshot contract without coupling them to React, an LLM provider, `ChatController`, or the Runtime execution engine.

Use Runtime flows for durable execution, DAGs, tools, and effects. Use this package for local or host-managed interaction state.


## Verified proof

- Package metadata and tests live under `packages/statechart/`.
- Package guide: https://www.agentskit.io/docs/packages/statechart
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/statechart
```

## Usage

```ts
import {
  createStatechartInstance,
  defineStatechart,
  serializeStatechart,
  transitionStatechart,
  type StatechartEvent,
} from '@agentskit/statechart'

type Context = { confirmed: boolean }
type Event = StatechartEvent<'confirm'> | StatechartEvent<'cancel'>

const parseContext = (input: unknown): Context => {
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof (input as { confirmed?: unknown }).confirmed !== 'boolean'
  ) {
    throw new TypeError('invalid context')
  }
  return input as Context
}

const confirmation = defineStatechart<
  Context,
  Event,
  'waiting' | 'confirmed' | 'cancelled'
>({
  id: 'confirmation',
  version: '1',
  initial: 'waiting',
  parseContext,
  states: {
    waiting: {
      on: {
        confirm: {
          target: 'confirmed',
          reduce: (context) => ({ ...context, confirmed: true }),
        },
        cancel: { target: 'cancelled' },
      },
    },
    confirmed: {},
    cancelled: {},
  },
})

const initial = createStatechartInstance(
  confirmation,
  { confirmed: false },
  { instanceId: 'interaction-42', now: '2026-07-13T12:00:00.000Z' },
)

const result = transitionStatechart(
  confirmation,
  initial,
  { type: 'confirm' },
  { now: '2026-07-13T12:01:00.000Z' },
)

if (result.status === 'accepted') {
  const snapshot = serializeStatechart(result.instance)
  await yourStorage.save(snapshot)
}
```

The host supplies IDs, timestamps, storage, and event delivery. That keeps transitions reproducible and the package portable across browser, server, native, and terminal runtimes.

## Contract

- `defineStatechart` validates targets and freezes a trusted runtime definition.
- `createStatechartInstance` validates and freezes JSON-compatible context.
- `transitionStatechart` is synchronous and returns an `accepted` or `rejected` result.
- `serializeStatechart` creates a versioned JSON-compatible snapshot.
- `restoreStatechart` accepts `unknown`, validates metadata and context, and never trusts serialized definitions.
- `notifyStatechartObserver` delivers a completed result separately; observer failure cannot alter state.

Events, contexts, and snapshots use an exact JSON boundary: sparse or decorated arrays, accessors, symbols, exotic prototypes, and non-finite numbers are rejected without invoking getters. Hostile but valid object keys such as `__proto__` remain ordinary data keys. Observers must complete synchronously; returned thenables are isolated as typed failures.

Context validation is injected through `parseContext`, so applications can use any validation library without adding one to this package.

## Deliberate boundaries

This package does not execute actions, persist snapshots, call agents or tools, retry events, deduplicate delivery, render components, or define product-specific states. Repeated events follow the current state's transition table; delivery idempotency belongs to the host.

See [ADR-0020](../../docs/architecture/adrs/0020-serializable-interaction-state.md) for the ownership decision and [ADR-0027](../../docs/architecture/adrs/0027-statechart-beta-boundaries.md) for the hardened beta boundaries.

## License

MIT

## Quick start

<!-- readme-example:quickstart -->
```ts
import { createStatechartInstance, defineStatechart } from '@agentskit/statechart'

const toggle = defineStatechart({
  id: 'toggle',
  version: '1',
  initial: 'off',
  parseContext: () => ({}),
  states: { off: { on: { toggle: { target: 'on' } } }, on: {} },
})

const instance = createStatechartInstance(toggle, {}, {
  instanceId: 'toggle-1',
  now: '2026-07-17T12:00:00.000Z',
})

console.log(instance.state)
```

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/statechart`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).

## How this fits the ecosystem

AgentsKit package — compose with the monorepo; see registry.agentskit.io, playbook.agentskit.io, akos.agentskit.io.
