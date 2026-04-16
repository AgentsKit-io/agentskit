# @agentskit/observability

See exactly what your agent does — every LLM call, tool execution, and reasoning step — with zero coupling to your agent code.

[![npm version](https://img.shields.io/npm/v/@agentskit/observability?color=blue)](https://www.npmjs.com/package/@agentskit/observability)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/observability)](https://www.npmjs.com/package/@agentskit/observability)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/observability)](https://bundlephobia.com/package/@agentskit/observability)
[![license](https://img.shields.io/npm/l/@agentskit/observability)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/EmersonBraun/agentskit?style=social)](https://github.com/EmersonBraun/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `observability` · `tracing` · `opentelemetry` · `langsmith` · `logging` · `monitoring`

## Why observability

- **Debug in minutes, not hours** — trace the full ReAct loop: which tools were called, what the LLM received, where it went wrong, all in one place
- **Works with your existing tracing stack** — LangSmith, OpenTelemetry (OTLP), or a simple console logger; observers are just `{ name, on(event) }` objects
- **No coupling, no lock-in** — observability attaches to `AgentEvent` emissions from the runtime; remove it and your agent code is unchanged
- **Non-blocking by design** — observer errors never surface to the agent; production stability is not at risk

## Install

```bash
npm install @agentskit/observability
```

## Quick example

```ts
import { createRuntime } from '@agentskit/runtime'
import { anthropic } from '@agentskit/adapters'
import { consoleLogger, langsmith } from '@agentskit/observability'

const runtime = createRuntime({
  adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  observers: [
    consoleLogger({ format: 'pretty' }),
    langsmith({ apiKey: process.env.LANGSMITH_API_KEY }),
  ],
})

const result = await runtime.run('Analyze sales data in ./data/sales.csv')
// Every step is now logged and traced automatically
```

## Features

- `consoleLogger({ format })` — pretty-print or JSON structured logs for local dev
- `langsmith({ apiKey })` — send runs to LangSmith for tracing and evaluation
- OpenTelemetry OTLP exporter — ship traces to any OTEL-compatible backend
- Observer interface: `{ name: string, on(event: AgentEvent): void }` — write custom observers in minutes
- Attaches via `observers` array on `createRuntime` — zero changes to agent logic

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Emits steps for tracing |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `AgentEvent` stream |
| [@agentskit/eval](https://www.npmjs.com/package/@agentskit/eval) | Quality gates alongside traces |

## Contributors

<a href="https://github.com/EmersonBraun/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=EmersonBraun/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/EmersonBraun/agentskit)
