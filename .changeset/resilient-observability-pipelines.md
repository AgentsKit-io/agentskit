---
'@agentskit/observability': minor
---

Harden production observability pipelines and cost guards on the beta line.

Lifecycle observers now expose `flush()` and idempotent `shutdown()` on Datadog,
Axiom, New Relic, LangSmith, and OpenTelemetry integrations. HTTP sinks share
managed batching with bounded queues (drop-oldest), single-flight POST, timeout,
retries/backoff, and isolated `onError`. Defaults: `batchSize` 25, `maxQueueSize`
1000, `flushIntervalMs` 2000, `maxRetries` 3, `retryBaseDelayMs` 100,
`requestTimeoutMs` 10000. Optional SDK peers resolve lazily; the package owns
flush/shutdown for SDKs it constructs. **Await `shutdown()`** during graceful
termination — export remains best-effort under queue pressure.

Cost guards use incremental per-event / per-active-model accounting, normalize
hostile usage, keep zero-budget payloads finite, and isolate callback/sink/clock
failures. Advanced mode adds additive `isRejected(tenant)` for `mode: 'reject'`
(hosts must consult it; the package does not abort the runtime). `warn` observes
only; `kill` continues to use persistent `disableRuntime` and `isDisabled`.
Public types include lifecycle/`onError` shapes used by these APIs.

This is not a stable promotion. `@agentskit/observability` remains beta, and the
90-day graduation clock begins only after this minor line is published.
