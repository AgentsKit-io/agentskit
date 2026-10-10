# @agentskit/observability

Profile: <code>beta-package</code>

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
- Package guide: https://www.agentskit.io/docs/reference/packages/observability
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/observability makes agent behavior inspectable with traces, costs, audit logs, devtools, and production telemetry hooks.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/reference/packages/observability) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

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
    consoleLogger({ format: 'human' }),
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
| `retryBaseDelayMs` | `100` | Full-jitter exponential backoff base, capped at 30s |
| `requestTimeoutMs` | `10000` | Per-request timeout |
| `onError` | — | Isolated error sink (throws/rejections never escape `on`) |

HTTP sinks retry network errors and responses with status `408`, `429`, or `5xx`.
A valid `Retry-After` delta-seconds or HTTP-date is a minimum delay; each wait is
capped at 30s. Missing or invalid headers use full-jitter exponential backoff.

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
- **`DEFAULT_PRICES`** is a baseline snapshot for convenience. **Override `prices` for current provider rates** — table numbers are not a stability contract. Guards fail closed on unknown models by default; the simple guard aborts its controller, while multi-tenant/advanced guards report or block according to their mode. Set `unknownModelPolicy: 'allow-zero'` only for an explicitly free/local model.

Simple `costGuard` aborts via the supplied `AbortController` when the run budget is exceeded (mark + abort before potentially hostile `onExceeded`). Multi-tenant and advanced guards do not abort the runtime by default.

### Durable budgets with `CostStore`

A guard without a store keeps its totals in process memory: they reset on restart and are not shared between instances or isolates. That is fine in development and wrong on serverless or multi-instance hosts, so the guards warn once when `NODE_ENV=production` and no store is set.

`CostStore` is the durable port. `reserve` holds an estimate against the tenant cap, `commit` replaces it with the real spend and writes the usage ledger, `release` returns it when the call fails, and `window` reads the current state. All four take the tenant id; `reserve`, `commit` and `release` are idempotent per `reservationId`.

```ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { multiTenantCostGuard } from '@agentskit/observability'
import { postgresCostMigrationSql, postgresCostStore } from '@agentskit/observability/postgres'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
await pool.query(postgresCostMigrationSql) // once, from your migration step
const store = postgresCostStore({ db: drizzle(pool) })

// Gate a request before calling the model.
const reserved = await store.reserve({ tenant, reservationId: turnId, amountUsd: 0.02, capUsd: planCapUsd })
if (!reserved.ok) return new Response('quota exceeded', { status: 402 })
try {
  const usage = await runTurn()
  await store.commit({ tenant, reservationId: turnId, actualUsd: usage.costUsd, usage: usage.calls })
} catch (error) {
  await store.release({ tenant, reservationId: turnId })
  throw error
}

// Or let a guard record every priced call and trip on the shared total.
const guard = multiTenantCostGuard({ budgets: { [tenant]: planCapUsd }, store })
```

- **Atomic cap.** The PostgreSQL store admits a reservation in one statement (`reserved + spent + amount <= cap`), so concurrent requests cannot overshoot the cap together. The cap is an argument of `reserve`: read it from your plan or entitlements table.
- **Accounting window.** Spend is grouped by `windowKey`, by default the UTC month (`2026-10`). Pass `windowKey` to the store options or per call for another period. With a store, a guard's budget applies to the current window.
- **Real spend wins.** `commit` records `actualUsd` even when it is above the reserved estimate. Reserve an upper estimate if the cap must never be passed.
- **Guards record after the fact.** A guard writes each priced `llm:end` to the store and trips when the stored total passes the budget. To stop a request before it spends, call `reserve` yourself as above.
- **Connection lifetime is yours.** Use a pool on Node. On Workers, create one `pg` client per request and close it in `waitUntil`. `drizzle-orm` and `pg` are optional peers, needed only for the `/postgres` subpath.
- **Your own store.** Implement `CostStore` over your tables and run `costStoreContract` from `@agentskit/observability/cost-store-contract` in your test suite. `createInMemoryCostStore()` is the development and test implementation.

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
