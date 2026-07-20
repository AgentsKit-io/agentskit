# RFC 0011 — `@agentskit/observability` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: @EmersonBraun
- **Package**: `@agentskit/observability`
- **Related**: [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/observability` from beta to stable. Lifecycle observers, bounded HTTP
export, SDK-bridge ownership, and cost-guard correctness/resilience are
implemented on the current beta line, but this proposal does **not** promote the
package or claim that publish/soak/release gates have elapsed.

## Proposed stable commitment

At 1.0, the package commits to the exports recorded by its declaration snapshot
and to the following behavioral surface:

- **Observer non-interference** — observers do not mutate agent messages, tool
  calls, or results; redaction wrappers may pass sanitized event copies to sinks.
- **Error isolation** — failures inside observer handlers, optional `onError`
  callbacks, alert sinks, SDK calls, resolvers, and clocks never escape
  `observer.on` as uncaught exceptions and never leave unhandled promise
  rejections from package-owned async work.
- **Lifecycle semantics** — Datadog, Axiom, New Relic, LangSmith, and
  OpenTelemetry factories return lifecycle observers with `flush(): Promise<void>`
  and idempotent `shutdown(): Promise<void>`. Hosts should await `shutdown`
  during graceful termination.
- **Bounded snapshots and queues** — HTTP sinks use a bounded queue with
  drop-oldest under pressure, single-flight batching, request timeout, and
  retries/backoff. Defaults: `batchSize` 25, `maxQueueSize` 1000,
  `flushIntervalMs` 2000, `maxRetries` 3, `retryBaseDelayMs` 100,
  `requestTimeoutMs` 10000. Export is best-effort; the package does not claim
  at-least-once or exactly-once delivery.
- **SDK ownership** — optional peers resolve lazily. The package owns
  flush/shutdown for SDKs it constructs and does not shut down a pre-existing
  global OpenTelemetry provider that it does not own.
- **Cost accounting and enforcement** — cost is incremental per `llm:end` using
  the active model for that event; token totals remain cumulative; hostile usage
  normalizes to zero; alert/callback numbers stay finite. Modes: `warn` (observe
  only), `reject` (host consults `isRejected(tenant)`), `kill` (persistent
  `disableRuntime` + `isDisabled`). `DEFAULT_PRICES` is a baseline; callers
  override for current provider rates (price table numbers are not contractual).
- **Optional peers** — LangSmith, OpenTelemetry packages, and Langfuse remain
  optional so consumers pay only for integrations they install.

Compatible changes after 1.0 include additive options, new sinks/guards behind
existing contracts, and expanded price keys. Breaking changes include removing
or renaming public exports, changing lifecycle/idempotence semantics, weakening
error isolation, changing queue drop policy without a major, or changing cost
enforcement mode contracts without the stable deprecation and major process.

## Evidence already implemented

- Unit suites cover HTTP batch queue/drop-oldest, retries/timeouts, lifecycle
  flush/shutdown, LangSmith/OpenTelemetry isolation, and cost-guard mixed-model
  incremental accounting, hostile usage, zero budgets, callback/sink isolation,
  `isRejected` / window roll, and hostile clock fallbacks without unhandled
  rejections.
- Package checks: strict TypeScript (`lint`), dual ESM/CJS build, vitest suite
  (hundreds of package tests in the current tree), and coverage measured above
  **93% lines** in recent hardening runs (evidence of the suite, not a permanent
  floor above the beta **60%** policy floor).
- Bundle: `@agentskit/observability` ESM entry remains under the **16 KB gzip**
  size-limit budget in recent measurements.

Public API snapshots, packed consumers, Doc Bridge, and README conformance are
repository-wide gates; they are not waived by this RFC.

## Gates that remain open

Under ADR 0024, the 90-consecutive-day soak starts when this hardening minor is
**published**. Publication has not occurred as part of this proposal; any later
date moves the earliest possible completion, and any later unplanned break resets
the clock.

Promotion also requires:

1. publish of the current (or equivalent) beta minor line;
2. ≥90 consecutive beta days after that publish without a resetting break;
3. releases from at least two distinct beta minor lines during the clean window;
4. an Accepted version of this dedicated RFC;
5. a complete `docs/stability/observability.json` evidence manifest accepted in review;
6. every direct internal runtime, optional, and peer dependency at stable;
7. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until all of the above are true, `@agentskit/observability` remains **beta**.

## Decision requested

Review whether the lifecycle, isolation, queue, SDK-ownership, and cost-enforcement
commitments are narrow enough for a stable lifecycle. Acceptance records the
intended freeze; it does **not** waive ADR 0024 gates or authorize promotion
before publish, soak, dual minor lines, evidence, and 1.0.0 are complete.
