# `@agentskit/observability-langfuse`

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)

Langfuse tracing adapter for AgentsKit. Emits one trace per agent run with nested spans for plan, tool calls, model generations, memory IO, and HITL gates. Token, cost, and latency metadata flow into the standard Langfuse `usage` and metadata fields.

## Install

```sh
npm install @agentskit/observability-langfuse langfuse
```

`langfuse` is loaded lazily — install it alongside this adapter.

## Usage

```ts
import { runAgent } from '@agentskit/runtime'
import { langfuse } from '@agentskit/observability-langfuse'

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

Multi-agent topologies (planner → worker → reviewer) link automatically: each delegated agent run is a child trace under the parent step, mirroring `@agentskit/observability`'s span tracker.

## Conventions

- Read-only: this observer never mutates messages, tool calls, or results.
- Errors from the Langfuse SDK are swallowed so they cannot break the run loop.
- Flushing is handled by the SDK on `flushAsync()` / process exit.

## License

MIT
