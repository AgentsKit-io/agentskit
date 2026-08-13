# v1.0.0 ecosystem readiness tracker

> Living doc. Tracks the criteria in [`STABILITY.md`](./STABILITY.md) → "Until v1.0.0"
> plus cross-framework parity. Update the status columns as work lands; the audit
> + plan that seeded this lives in [`studies/v1-readiness-audit.md`](./studies/v1-readiness-audit.md).
> Last updated: 2026-07-17.

## Project-level v1.0.0 criteria

| # | Criterion (from STABILITY.md) | Status | Evidence / gap |
|---|---|---|---|
| 1 | All six core contracts have ≥1 **external consumer** outside this repo | 🟡 signal, unconfirmed | npm downloads (last month, verified 2026-06-15): core 1462, adapters 1098, runtime 935, react 488, vue 116 — non-zero external pull-through, but download counts can't confirm a *named* external consumer per contract (CI/mirrors/own apps included). Needs qualitative confirmation (GitHub dependents / real projects). |
| 2 | CI gates (bundle size, coverage) held **two full sprints** without regression | 🟡 clock restarted | 17 gates green today, but the gate set just expanded (this PR) — the 2-sprint no-regression window restarts from the first green sprint after merge. |
| 3 | Public **semver commitment** documented + honored | 🟢 documented | Ecosystem-wide statement at [`SEMVER-COMMITMENT.md`](./SEMVER-COMMITMENT.md); honored structurally by CI gates (tier/badge parity, coverage floors, promotion-RFC, bundle budget). "Honored" stays ongoing across releases. |

Legend: 🟢 done · 🟡 in progress · ⬜ not started.

## Stability tiers (gate-enforced)

`check-stability-tier`, `check-readme-badge`, `check-coverage-floor`, and
`check-promotion-rfc` keep `package.json`, the `STABILITY.md` map, README badges,
coverage bars, and promotion RFCs in lockstep. See [`STABILITY.md`](./STABILITY.md)
for the authoritative tier map.

- **stable (1):** core
- **beta (24):** adapters, cli, ink, memory, rag, react, runtime, skills, templates,
  tools, eval, eval-braintrust, observability, observability-langfuse, validation,
  sandbox, integrations, statechart, mcp, **vue**, **svelte**, **solid**, **react-native**, **angular**
- **alpha (0):** none

## MCP stabilization wave

`@agentskit/mcp` graduates from alpha to beta as an honestly scoped MCP tools
bridge over `@agentskit/tools/mcp`, with stdio CLI and optional agent delegation.

- **Implemented:** current MCP-compatible unique tool-name validation; immutable
  published tool lists; isolated sync/async observers; typed server and agent
  configuration failures; bounded tasks and steps; path-safe registry IDs;
  abortable, timed, byte-bounded hosted/raw reads; fail-closed testable CLI;
  privileged-tool opt-ins; secret-free diagnostics; real ESM/CJS/bin packaging;
  100% package line coverage outside the thin bin entrypoint.
- **Still open:** publish the next minor, gather public host compatibility evidence,
  complete ≥90 consecutive beta days, release a second distinct beta minor during
  that window, accept promotion evidence, and coordinate 1.0.0.
- **Tier:** promoted to **beta**. This does not claim built-in HTTP/WebSocket,
  resources, prompts, sampling, auth, rate limiting, or persistence.

## Statechart stabilization wave

`@agentskit/statechart` graduates from alpha to beta with deterministic hostile-input,
snapshot, observer, and package boundaries while retaining zero runtime dependencies.

- **Implemented:** null-prototype definition maps; exact JSON cloning that rejects
  sparse/decorated arrays, accessors, symbols, exotic prototypes, and non-finite
  numbers without invoking getters; total frozen rejection results for unknown
  snapshots; host-input and safe-revision validation; deep guard/reducer immutability;
  synchronous thenable-safe observer isolation; dual ESM/CJS packaging and adversarial
  coverage above the package's 95% line floor.
- **Still open:** publish the next minor, exercise it through public downstream
  integrations, complete ≥90 consecutive beta days, release a second distinct beta
  minor during that window, accept promotion evidence, and coordinate 1.0.0.
- **Tier:** promoted to **beta**. No stable claim is valid before every open gate above
  is complete.

## RAG stabilization wave

`@agentskit/rag` now has contract, failure, cancellation, pagination, packaging,
and Metro evidence for its current beta surface. The hardening line intentionally
changes hybrid blending to min-max candidate normalization, so it must be
published as a new minor before the ADR 0024 soak clock begins.

- **Implemented:** Retriever R1–R11 enforcement; terminating chunking; finite
  BM25/hybrid scores; validated custom, Voyage, and Jina reranking; typed loader
  request/body errors; partial-versus-total download semantics; Notion,
  S3/GCS/Dropbox, and OneDrive pagination progress; abort propagation; root and
  `./chunker` package/Metro purity.
- **Still open:** publish the minor line, complete ≥90 consecutive beta days,
  release a second distinct beta minor during that window, accept RFC 0010,
  approve `docs/stability/rag.json` evidence, and coordinate 1.0.0.
- **Tier:** remains **beta**. No stable claim is valid before every open gate
  above is complete.

## Observability stabilization wave

`@agentskit/observability` now has lifecycle, HTTP-sink, SDK-bridge, and cost-guard
hardening for its current beta surface (error isolation, bounded queues, incremental
mixed-model accounting, `isRejected`, finite zero-budget payloads). The soak clock
in ADR 0024 starts **only when this wave’s minor is actually published** — not when
docs or the unreleased changeset land.

- **Implemented:** `LifecycleObserver` on Datadog/Axiom/New Relic and
  LangSmith/OpenTelemetry; managed batching (defaults: batch 25, queue 1000
  drop-oldest, flush 2000 ms, retries 3, base delay 100 ms, timeout 10 s) with
  isolated `onError`; lazy optional peers and package-owned flush/shutdown for
  constructed SDKs; cost guards with incremental per-event/per-active-model
  accounting, hostile usage normalization, isolated callbacks/sinks/clocks,
  advanced `warn` / `reject` (`isRejected`) / `kill` (`isDisabled` +
  `disableRuntime`); suite evidence currently **>93%** package line coverage and
  ESM size under the **16 KB** gzip budget (measurement, not a permanent floor).
- **Still open:** publish the minor line, complete ≥90 consecutive beta days after
  that publish, release a second distinct beta minor during that window, accept
  RFC 0011, approve `docs/stability/observability.json` evidence in review, ensure
  stable internal deps, and coordinate 1.0.0.
- **Tier:** remains **beta**. No stable claim is valid before every open gate
  above is complete.

## Eval stabilization wave

`@agentskit/eval` now has suite, replay, snapshot, CI-reporting, and optional
Braintrust hardening for its current beta surface. The private
`@agentskit/eval-braintrust` implementation continues to ship only through the
public `@agentskit/eval/braintrust` subpaths.

- **Implemented:** malformed agent/scorer isolation; finite `[0, 1]` score and
  threshold enforcement; cassette shape/date validation; defensive snapshots
  across recording, replay, time travel, and replay-against; portable replay
  conditions; hostile JUnit/GitHub Actions escaping; awaited Braintrust
  log/flush/summarize with bounded non-secret warnings; 95% line-coverage floors
  for both packages; root plus eight public subpaths covered by repository API
  and packed-consumer gates.
- **Still open:** publish the minor line, complete ≥90 consecutive beta days
  after publication, release a second distinct beta minor during that window,
  accept RFC 0012, approve `docs/stability/eval.json` evidence, ensure every
  direct internal/peer dependency required by the stable surface is stable, and
  coordinate 1.0.0.
- **Tier:** remains **beta**. The current work prepares evidence; it does not
  start the soak clock or authorize a stable claim.

## Sandbox stabilization wave

`@agentskit/sandbox` now has E2B lifecycle, config validation, Web Worker
narrowing, local-runtime, and documentation-honesty hardening for its current
beta surface. Optional peer `@e2b/code-interpreter` remains optional.

- **Implemented:** non-empty apiKey and finite timeouts; `timeoutMs` +
  `allowInternetAccess` on E2B create (network default false); concurrent init /
  dispose-during-init / double dispose / execute-after-dispose; execute timeout
  kills/resets the VM; peer-missing only for module resolution; stdout+stderr
  byte caps; `memoryLimit` documented as custom-backend hint only; seatbelt
  scoped reads; docker escape rejection; nodeSpawner combined byte caps; policy
  snapshots; requireSandbox routing semantics documented; RFC 0013 Proposed.
- **Still open:** publish the minor line, complete ≥90 consecutive beta days
  after publication, release a second distinct beta minor during that window,
  accept RFC 0013, approve `docs/stability/sandbox.json` evidence, ensure every
  direct internal/peer dependency required by the stable surface is stable, and
  coordinate 1.0.0.
- **Tier:** remains **beta**. No stable claim is valid before every open gate
  above is complete.

## Templates stabilization wave

`@agentskit/templates` now has scaffold security, config validation, factory
validator, and blueprint-honesty hardening for its current beta surface.

- **Implemented:** `ScaffoldConfig.overwrite` (default false); runtime
  allowlist of 8 types; unscoped kebab-case name validation; path containment;
  destination-root symlink rejection; sibling staging + atomic rename; overwrite backup/rollback;
  no partial trees; final paths only; memory-chat `MemoryRecord` contract;
  generated packages with `engines.node >=20`, MIT, `sideEffects: false`, tsup
  `clean: true`, named source exports; caret-pinned deps (`@agentskit/core
  ^1.0.0`, flow `@agentskit/runtime ^0.10.0`) without wildcards or unused
  adapters/memory deps; factory validators (trim non-empty fields, JSON Schema
  objects, finite temperature, `capabilities`/`metadata` passthrough);
  adversarial + matrix + typecheck + package-manifest suites; RFC 0014 Proposed.
- **Still open:** publish the minor line, complete ≥90 consecutive beta days
  after publication, release a second distinct beta minor during that window,
  accept RFC 0014, approve `docs/stability/templates.json` evidence, ensure
  dependencies required by the stable surface meet policy, and coordinate 1.0.0.
- **Tier:** remains **beta**. No stable claim is valid before every open gate
  above is complete.

## Validation stabilization wave

The private `@agentskit/validation` workspace implementation now has nested
schema, strict-extra, error-path, coercion, custom-Ajv, packaging, and
documentation hardening. Consumers continue to use only the public
`@agentskit/tools/validation` subpath; the private package does not graduate or
publish independently.

- **Implemented:** recursive ordinary-object hardening without source-schema
  mutation; explicit additional-property policy preservation; safe handling of
  draft-07 composition/applicator boundaries; local refs, arrays, definitions,
  and dependencies; required/additional field paths; decoded JSON Pointer
  escapes and array indices; value-free multi-error summaries; lazy compile and
  identity cache; explicit coercion mutation and custom-Ajv precedence;
  adversarial coverage above 98% branches; public subpath package assertions;
  RFC 0015 Proposed.
- **Still open:** publish the `@agentskit/tools` hardening minor, complete its
  clean beta window and released-minor requirements, accept the tools promotion
  RFC set including RFC 0015, approve complete tools evidence, satisfy stable
  dependency policy, and coordinate `@agentskit/tools` 1.0.0.
- **Tier:** remains **beta** and coupled to `@agentskit/tools`. No separately
  published or stable `@agentskit/validation` claim is valid.

## Cross-framework binding parity

The ecosystem promise is "same `ChatReturn` contract, every host." `useChat` /
store / service already returns the identical contract everywhere. The remaining
work is the **headless component suite** (8 components mirroring `@agentskit/react`).

| Binding | useChat/contract | Headless components | Tier | Notes |
|---|---|---|---|---|
| react | ✅ | ✅ 8/8 | stable→beta* | Canonical reference |
| ink | ✅ | ✅ (terminal set) | beta | ANSI/keyboard variant |
| **vue** | ✅ | ✅ 8/8 | **beta** | First binding at parity (runtime `h()`) |
| **svelte** | ✅ (`createChatStore`) | ✅ 8/8 | **beta** | Svelte 5 `.svelte` + `esbuild-svelte` build + `svelteTesting` — reference for compiler-based bindings |
| **solid** | ✅ | ✅ 8/8 | **beta** | Solid JSX + `vite-plugin-solid`/`esbuild-plugin-solid`; `data-ak-*` |
| **react-native** | ✅ | ✅ 8/8 | **beta** | RN primitives, `testID`-keyed headless; vitest RN mock |
| **angular** | ✅ (`AgentskitChat`) | ✅ 8/8 | **beta** | Standalone components; partial-Ivy AOT/APF (ESM-only) via ng-packagr; TestBed + package AOT gates |

\* react is `beta` per the honest-tier reconciliation; promote to stable via a
promotion RFC when its `ChatReturn` surface is frozen.

**All 6 bindings now at beta parity** (react, ink, vue, svelte, solid, react-native, angular).
Remaining ecosystem work:
- **beta→stable promotions** — surface frozen in RFC 0004 (Proposed); each binding promotes
  once it completes ≥ 1 minor at beta without breaking. **Soak status: NOT STARTED** —
  the soak clock starts after the next release cut that publishes the current binding
  minors (`changeset version` + publish), then runs ≥ 1 minor cycle. Do not claim stable
  until that soak + the Accepted promotion path complete.
- **v1.0.0 criteria #1 (external consumers) + #2 (2-sprint gate hold)** — require real adoption
  and elapsed time; cannot be manufactured. Criterion #3 (semver commitment) is documented.
