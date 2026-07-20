# RFC 0013 — `@agentskit/sandbox` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: @EmersonBraun
- **Package**: `@agentskit/sandbox`
- **Related**: [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/sandbox` from beta to stable. Lifecycle, configuration, local
runtime, and documentation honesty are hardened on the current beta line. This
proposal does **not** promote the package or claim that publish, soak, release,
dependency, or evidence gates have elapsed.

## Proposed stable commitment

At 1.0, the package commits to the root plus `./sandbox`, `./types`, and
`./web` subpaths, and to these behaviors:

- **E2B lifecycle** — non-empty `apiKey`; finite positive timeouts; `Sandbox.create({ apiKey, timeoutMs, allowInternetAccess })` with default network deny; concurrent init coalescing; dispose during init kills orphans; double dispose safe; execute after dispose fails clearly; execute timeout kills/resets the VM; combined stdout+stderr byte cap without changing `ExecuteResult`.
- **Error taxonomy** — peer missing only for genuine module resolution failures; other initialization failures wrap as `SandboxError` with `cause`; execution failures remain explicit non-zero `ExecuteResult` values; never classify every `@e2b`-mentioning error as peer missing.
- **createSandbox / sandboxTool** — runtime validation of language and timeout; idempotent dispose; warmup rethrows config/peer errors and only tolerates operational probe failures.
- **memoryLimit** — remains on the type as a custom-backend hint; **not** enforced by E2B or Web Worker adapters.
- **Web Worker** — timeout validation; full outbound message narrowing; byte caps on execute/stream; documented as thread+DOM isolation only (not network/FS boundary; not WebContainer).
- **Local runtimes** — seatbelt scoped reads; absolute `workspaceRoot`; positive timeout/maxOutputBytes; docker escape rejection for privileged/host namespaces/extra mounts/devices; nodeSpawner combined byte caps; policy snapshots; `requireSandbox` delegates to `sandbox.execute` without running the original body.
- **bwrap registry level** — remains `'process'` for compatibility until a dedicated breaking RFC remaps isolation ratings.

Compatible post-1.0 changes include additive backends and optional config that
preserve existing behavior. Breaking
changes include removing subpaths, weakening dispose/timeout guarantees,
silently accepting invalid language/timeout, or claiming Web Worker as a
multi-tenant security boundary.

## Evidence already implemented

- Deterministic suites cover E2B lifecycle, config validation, Web Worker
  narrowing/caps, seatbelt profile scope, docker escape rejection, spawner
  byte caps/timeouts, policy snapshots, and package-manifest/web purity.
- Package remains **beta** in `package.json` / README badge / STABILITY map.
- Optional peer `@e2b/code-interpreter` declared with devDependency retained
  for tests.

## Gates that remain open

Under ADR 0024, the 90-consecutive-day soak begins only when this hardening
minor is **published**. Publication has not occurred as part of this proposal;
any later date moves the earliest possible completion, and an unplanned break
resets the clock.

Promotion also requires:

1. publish of the current or equivalent beta minor line;
2. ≥90 consecutive beta days after publication without a resetting break;
3. releases from at least two distinct beta minor lines during the clean window;
4. an Accepted version of this dedicated RFC;
5. a complete `docs/stability/sandbox.json` evidence manifest accepted in review;
6. stable status for every direct internal runtime/peer dependency required by
   the committed stable surface;
7. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until every gate is complete, `@agentskit/sandbox` remains **beta**.

## Decision requested

Review whether the lifecycle, isolation honesty, local-runtime, and policy
routing commitments are narrow enough for a future stable freeze. Acceptance
records the intended freeze; it does not waive ADR 0024 or authorize promotion
before publication, soak, releases, evidence, dependencies, and 1.0.0 are complete.
