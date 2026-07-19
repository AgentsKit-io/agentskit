# Conventions — `@agentskit/observability`

Observers and integrations for logging, tracing, cost control, and metric emission. Pairs with the `Observer` primitives in `@agentskit/core`.

## Stability tier: `beta`

Observer shape is stable; provider integrations and production lifecycle APIs are growing. Breaking changes may land in minor bumps while the package remains beta. Promotion gates live in [docs/STABILITY.md](../../docs/STABILITY.md) and [RFC 0011](../../rfcs/0011-observability-stable.md).

## Scope

- **Console observer** — local-dev logger
- **Provider integrations** — LangSmith, OpenTelemetry (OTLP), Datadog / Axiom / New Relic HTTP sinks; Langfuse via `@agentskit/observability/langfuse`
- **Lifecycle** — `LifecycleObserver` (`flush` / idempotent `shutdown`) on production sinks and SDK bridges
- **Cost guards** — per-run, multi-tenant, and advanced modes
- **Tracing helpers** — span tracker, trace viewer, replay, SLO, audit log, prod control

## Observers are read-only

Per runtime RT9: observers **cannot** mutate messages, tool calls, or results. Side effects (log, metric emission, trace span, cost bookkeeping flags) are fine; rewriting agent state is not.

If you're tempted to write an observer that rewrites a tool call or redacts a prompt into the agent path, it's not an observer — it's a wrapper runtime. Build it as such. Redaction helpers that wrap another observer and pass a sanitized *copy* of events to the sink are fine.

## Lifecycle and error isolation

- Production sinks/bridges that return `LifecycleObserver` expose `flush(): Promise<void>` and idempotent `shutdown(): Promise<void>`.
- HTTP batch sinks use a bounded queue (drop-oldest when full), single-flight batch POST, timeout, and retries with exponential backoff. Defaults: `batchSize` 25, `maxQueueSize` 1000, `flushIntervalMs` 2000, `maxRetries` 3, `retryBaseDelayMs` 100, `requestTimeoutMs` 10000.
- Failures surface through optional `onError` only. Sync throws and async rejections from callbacks, sinks, SDK calls, and resolvers must not escape `observer.on` or produce `unhandledRejection`.
- Optional SDK peers (LangSmith, OpenTelemetry packages, Langfuse) resolve lazily. The package owns flush/shutdown of SDKs it constructs; hosts own SDKs they inject.
- **Do not claim at-least-once or exactly-once delivery.** Best-effort export with bounded drop under pressure is the honest model. Hosts should `await observer.shutdown()` during graceful termination.

## Cost guards

- Accounting is **incremental per `llm:end` event** using the model active for that event. Never reprice historical tokens with a later model.
- Hostile usage (`NaN` / `Infinity` / negative) normalizes to zero; costs, utilization, and alert payloads stay finite and JSON-safe (zero budgets use utilization sentinel `1` when spend is positive).
- `mode: 'warn'` observes only. `mode: 'reject'` sets an observable flag — hosts must call `isRejected(tenant)` (the package does not abort the runtime). `mode: 'kill'` uses `disableRuntime` + `isDisabled` and stays fail-closed when disable fails.
- `DEFAULT_PRICES` is a **baseline snapshot**. Callers should pass `prices` for current provider rates; do not treat table numbers as contractual.

## Adding a new observer

1. Create `src/<name>.ts`.
2. Export a factory: `export function consoleObserver(opts): Observer` (or `LifecycleObserver` when flush/shutdown apply).
3. Implement only the events you care about — all observer methods are optional.
4. Isolate internal and callback errors (`onError` or equivalent). Never throw out of an observer.
5. Re-export from `src/index.ts`.

## Adding a provider integration

1. Prefer extending the shared HTTP batch sink or an existing SDK bridge pattern.
2. Accept configuration at construction (`apiKey`, `projectId`, etc.).
3. Batch and time out network work; never block the runtime on unbounded I/O.
4. Keep optional SDKs as optional peers; import them dynamically.
5. Document provider-specific fields used from span/event metadata in the package README.

## Testing

- Observers are tested via a mock runtime (or direct event injection) that asserts side effects.
- Do not reach out to real provider APIs in unit tests. Mock `fetch` or the SDK.
- Cover error isolation (sync throw + async reject + empty `unhandledRejection`), lifecycle flush/shutdown idempotence, queue drop-oldest, and cost-guard accounting edge cases.
- Integration tests against real providers run separately and are not blocking.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Mutating a message or result in an observer | Wrap the runtime; observers are read-only |
| Blocking the runtime on slow API calls | Fire-and-forget with bounded batching |
| Throwing on missing optional fields | Check for presence; metadata is opaque |
| Logging at every chunk in production | Sample or aggregate |
| Assuming reject mode aborts the run | Host consults `isRejected(tenant)` |
| Skipping `shutdown` on process exit | `await` lifecycle `shutdown` during graceful termination |

## Review checklist for this package

- [ ] Bundle size under **16 KB gzipped** (`.size-limit.json` entry for `@agentskit/observability`)
- [ ] Coverage floor for beta holds (**60%** lines). Hardening suites currently measure **>93%** lines in-package — that figure is evidence of the current suite, not a permanent contract above the floor
- [ ] Observer does not mutate runtime agent state
- [ ] Errors isolated; never thrown out of `on` / never unhandled rejections from package async work
- [ ] Lifecycle observers document flush/shutdown expectations
- [ ] Provider integration documented in package README
- [ ] User-facing changes include a Changeset and keep README, canonical docs, and Doc Bridge aligned
