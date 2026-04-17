# @agentskit/observability

See exactly what your agent does — every LLM call, tool execution, and reasoning step — with zero coupling to your agent code.

[![npm version](https://img.shields.io/npm/v/@agentskit/observability?color=blue)](https://www.npmjs.com/package/@agentskit/observability)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/observability)](https://www.npmjs.com/package/@agentskit/observability)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/observability)](https://bundlephobia.com/package/@agentskit/observability)
[![license](https://img.shields.io/npm/l/@agentskit/observability)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

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

## Token counting

`@agentskit/observability` includes a zero-dependency token counting API — useful for context-window budget checks, cost estimation, and message trimming.

### Fast approximate count

```ts
import { countTokens, approximateCounter } from '@agentskit/observability'

// async convenience function
const total = await countTokens(messages)
if (total > 120_000) trimOldMessages(messages)

// synchronous via counter directly
const syncTotal = approximateCounter.count(messages)
```

Uses the `chars / 4 + 4 per message` heuristic. Slightly over-estimates — intentional for budget guards.

### Per-message breakdown

```ts
import { countTokensDetailed } from '@agentskit/observability'

const { total, perMessage } = await countTokensDetailed(messages)
// total      → number
// perMessage → number[]  (one entry per message, same order)
```

### Exact count with a real tokenizer

```ts
import { createProviderCounter, countTokens } from '@agentskit/observability'
import { encoding_for_model } from 'tiktoken'

const enc = encoding_for_model('gpt-4o')
const tiktokenCounter = createProviderCounter({
  name: 'tiktoken',
  tokenize: (text) => [...enc.encode(text)],
})

const exact = await countTokens(messages, { counter: tiktokenCounter, model: 'gpt-4o' })
```

`createProviderCounter` wraps any `tokenize(text, model?)` function in a `TokenCounter` that conforms to the core contract and supports `countDetailed` automatically.

## Features

- `consoleLogger({ format })` — pretty-print or JSON structured logs for local dev
- `langsmith({ apiKey })` — send runs to LangSmith for tracing and evaluation
- OpenTelemetry OTLP exporter — ship traces to any OTEL-compatible backend
- `approximateCounter` — zero-dep synchronous token counter (`chars/4` heuristic)
- `countTokens` / `countTokensDetailed` — async token counting with optional custom counter
- `createProviderCounter` — factory to wrap tiktoken or any tokenizer in the `TokenCounter` contract
- Observer interface: `{ name: string, on(event: AgentEvent): void }` — write custom observers in minutes
- Attaches via `observers` array on `createRuntime` — zero changes to agent logic

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Emits steps for tracing |
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `AgentEvent` stream |
| [@agentskit/eval](https://www.npmjs.com/package/@agentskit/eval) | Quality gates alongside traces |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
