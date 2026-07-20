# @agentskit/observability

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

See exactly what your agent does — every LLM call, tool execution, and reasoning step — with zero coupling to your agent code.

[![npm version](https://img.shields.io/npm/v/@agentskit/observability?color=blue)](https://www.npmjs.com/package/@agentskit/observability)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/observability)](https://www.npmjs.com/package/@agentskit/observability)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/observability?label=bundle)](https://bundlejs.com/?q=@agentskit/observability)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `ai-agents` · `observability` · `tracing` · `opentelemetry` · `langsmith` · `logging` · `monitoring`

## Verified proof

- Package metadata and tests live under `packages/observability/`.
- Package guide: https://www.agentskit.io/docs/packages/observability
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/observability makes agent behavior inspectable with traces, costs, audit logs, devtools, and production telemetry hooks.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/observability) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why observability

- **Debug in minutes, not hours** — trace the full ReAct loop: which tools were called, what the LLM received, where it went wrong, all in one place
- **Works with your existing tracing stack** — LangSmith, OpenTelemetry (OTLP), or a simple console logger; observers are just `{ name, on(event) }` objects
- **No coupling, no lock-in** — observability attaches to `AgentEvent` emissions from the runtime; remove it and your agent code is unchanged
- **Non-blocking by design** — observer errors never surface to the agent; production stability is not at risk

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/observability
```

## Quick example

<!-- readme-example:quickstart -->
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
console.log(result.content)
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
- `langsmith({ apiKey })` — LangSmith lifecycle observer (optional `langsmith` peer)
- `opentelemetry(config)` — OTLP lifecycle observer (optional OpenTelemetry peers)
- `datadogSink` / `axiomSink` / `newRelicSink` — HTTP lifecycle sinks with managed batching
- Cost guards — `costGuard`, `multiTenantCostGuard`, `createAdvancedCostGuard`
- `approximateCounter` — zero-dep synchronous token counter (`chars/4` heuristic)
- `countTokens` / `countTokensDetailed` — async token counting with optional custom counter
- `createProviderCounter` — factory to wrap tiktoken or any tokenizer in the `TokenCounter` contract
- Observer interface: `{ name: string, on(event: AgentEvent): void }` — write custom observers in minutes
- Attaches via `observers` array on `createRuntime` — zero changes to agent logic

## Production lifecycle (sinks + SDK bridges)

Datadog, Axiom, New Relic, LangSmith, and OpenTelemetry factories return **lifecycle observers**:

```ts
type LifecycleObserver = Observer & {
  flush(): Promise<void>
  shutdown(): Promise<void> // idempotent
}
```

HTTP sinks share bounded, best-effort export (not a delivery guarantee):

| Option | Default | Role |
|---|---|---|
| `batchSize` | `25` | Max events per POST |
| `maxQueueSize` | `1000` | Hard queue cap; **drop oldest** when full |
| `flushIntervalMs` | `2000` | Periodic drain |
| `maxRetries` | `3` | Retries after the initial attempt |
| `retryBaseDelayMs` | `100` | Exponential backoff base (capped; no jitter) |
| `requestTimeoutMs` | `10000` | Per-request timeout |
| `onError` | — | Isolated error sink (throws/rejections never escape `on`) |

Batching is **single-flight**. Optional SDK peers resolve lazily; the package owns flush/shutdown for SDKs it constructs. During graceful process or request termination, **await `shutdown()`** so in-flight batches have a chance to drain. Overflow still drops oldest under pressure — plan capacity and `onError` monitoring accordingly.

## Cost guards

```ts
import {
  costGuard,
  multiTenantCostGuard,
  createAdvancedCostGuard,
} from '@agentskit/observability'

const controller = new AbortController()
const guard = costGuard({
  budgetUsd: 0.10,
  controller,
  // prices: { 'gpt-4o': { input: …, output: … } }, // override DEFAULT_PRICES
})

// Advanced modes
const advanced = createAdvancedCostGuard({
  budgets: { tenantA: 1 },
  mode: 'reject', // 'warn' | 'reject' | 'kill'
  // mode 'kill' requires disableRuntime(tenant, reason)
})
advanced.setTenant('tenantA')
// Host enforcement for reject:
if (advanced.isRejected('tenantA')) {
  // reject the request / stop scheduling work
}
```

Semantics (current hardening line):

- **Incremental accounting** — each `llm:end` adds cost for tokens on that event using the **active model** for that event. Historical tokens are never repriced when the model changes. Token totals stay cumulative.
- **Hostile usage** — `NaN` / `Infinity` / negative prompt or completion counts become `0` and never poison cost, state, or JSON payloads.
- **Zero budgets** — first positive spend exceeds; utilization and callbacks stay finite (sentinel `1` when budget is `0` and spend is positive).
- **Isolation** — `onCost` / `onExceeded` / alert sinks / `disableRuntime` / `tenantOf` / `now` failures are isolated; optional `onError` reports them without unhandled rejections.
- **Modes** — `warn` observes only; `reject` is enforced by the **host consulting `isRejected(tenant)`** (window rejections clear when the window rolls; overall rejections until `reset`); `kill` calls persistent `disableRuntime` and exposes `isDisabled` (fail-closed if disable fails).
- **`DEFAULT_PRICES`** is a baseline snapshot for convenience. **Override `prices` for current provider rates** — table numbers are not a stability contract.

Simple `costGuard` aborts via the supplied `AbortController` when the run budget is exceeded (mark + abort before potentially hostile `onExceeded`). Multi-tenant and advanced guards do not abort the runtime by default.

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

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/observability`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
