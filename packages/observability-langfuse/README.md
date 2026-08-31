# `@agentskit/observability/langfuse`

Profile: <code>concise-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

**Tags:** `agentskit` · `typescript` · `ai-agents`

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Langfuse tracing adapter for AgentsKit. Emits one trace per serialized agent run with nested spans for plan, tool calls, model generations, and memory IO. Token and latency metadata are forwarded; cost is not normalized by this adapter, and HITL is not emitted until the canonical event contract includes it.


## Verified proof

- Package metadata and tests live under `packages/observability-langfuse/`.
- Package guide: https://www.agentskit.io/docs/for-agents/observability-langfuse
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/observability/langfuse sends AgentsKit traces to Langfuse with spans for planning, model calls, tools, latency, and tokens.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/for-agents/observability-langfuse) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/observability langfuse
```

`langfuse` is loaded lazily — install it alongside this adapter.

## Usage

```ts
import { runAgent } from '@agentskit/runtime'
import { langfuse } from '@agentskit/observability/langfuse'

const observer = langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_HOST,
  sessionId: 'demo-session',
  tags: ['agentskit', 'showcase'],
})

await runAgent({
  /* ...agent config... */
  observers: [observer],
})
```

If `publicKey` / `secretKey` / `baseUrl` are omitted, the adapter falls back to `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_HOST`.

## Span model

| AgentsKit event | Langfuse object | Notes |
|---|---|---|
| `agent:step` | `span` | Top-level loop step (plan / act / observe). |
| `llm:start` / `llm:end` | `generation` | Captures model, input message count, output content (truncated), and token usage. |
| `tool:start` / `tool:end` | `span` | Captures tool name, args, result snapshot, and duration. |
| `memory:load` / `memory:save` | `span` | Captures message count. |
| `error` | annotates current span | Sets `level: 'ERROR'` and `statusMessage`. |

Use one observer instance per serialized run. The canonical event contract has
no correlation ID, so concurrent/interleaved runs and delegated parent-child
links are not claimed by this adapter yet.

## Conventions

- Read-only: this observer never mutates messages, tool calls, or results.
- Errors from the Langfuse SDK are swallowed so they cannot break the run loop.
- Flushing is handled by the SDK on `flushAsync()` / process exit.

## License

MIT

## Quick start

<!-- readme-example:quickstart -->
```ts
import '@agentskit/observability/langfuse'
console.log('@agentskit/observability/langfuse loaded')
```

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published through `@agentskit/observability/langfuse`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
