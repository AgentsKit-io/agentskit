# RFC 0012 — `@agentskit/eval` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: @EmersonBraun
- **Package**: `@agentskit/eval`
- **Related**: [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/eval` from beta to stable. Suite execution, deterministic replay,
prompt snapshots/diffs, CI reporting, and optional Braintrust scoring are
hardened on the current beta line. This proposal does **not** promote the
package or claim that publish, soak, release, dependency, or evidence gates have
elapsed.

## Proposed stable commitment

At 1.0, the package commits to the root and eight subpaths recorded by its
declaration snapshot and to these behaviors:

- **Suite isolation** — `runEval({ agent, suite })` does not mutate the suite.
  Agent failures, malformed response shapes, and assertion-predicate failures
  become failed cases without aborting later cases. Assertion failures preserve
  available output and token usage.
- **Replay integrity** — cassettes remain versioned; parsing validates their
  essential shape and revives message dates. Recording, replay adapters, replayed
  chunks, replay-against, time-travel snapshots, and forks isolate mutable plain
  data so callers cannot rewrite historical evidence by reference.
- **Portable replay boundary** — `@agentskit/eval/replay` remains safe under its
  browser and React Native conditions. Filesystem persistence belongs to the
  explicit Node-only `@agentskit/eval/replay/io` entry. Compatibility IO names
  in portable entries reject with a deterministic Node-only diagnostic.
- **Numeric integrity** — similarity thresholds, regression thresholds, scorer
  output, token counts, concurrency/limit options, and time-travel indices reject
  non-finite or invalid values. Embedding comparison rejects empty, non-numeric,
  non-finite, or dimension-mismatched vectors instead of producing `NaN`.
- **CI output safety** — JUnit CDATA and XML attributes, Markdown cells, and
  GitHub Actions workflow-command data/properties escape hostile content.
  `reportToCi` writes reports and returns pass/fail; it never terminates the host
  process.
- **Optional Braintrust lifecycle** — the SDK resolves lazily only when an API
  key enables upload. Logs are awaited, experiment flush precedes summarize,
  and import/init/log/flush/summarize failures leave local results intact while
  returning bounded deterministic warnings without SDK error text or secrets.
- **Scorer contract** — scorer failures are isolated. Runtime output requires a
  non-empty name and a finite score in `[0, 1]`; invalid custom output becomes a
  `scorer_error`. Bundled scorers remain pure and perform no model/network calls.

Compatible post-1.0 changes include additive result metadata, new pure scorers,
new report formats, and optional configuration that preserves these defaults.
Breaking changes include removing/renaming subpaths or exports, mutating caller
data, weakening case/scorer isolation, changing replay matching semantics,
making Braintrust mandatory, silently accepting invalid scores, or making a
reporter terminate the process.

`@agentskit/eval-braintrust` remains a private workspace implementation. Its
public contract is the three `@agentskit/eval/braintrust` subpaths and graduates
with `@agentskit/eval`, not as an independently published package.

## Evidence already implemented

- Deterministic suites cover agent/expected failures, malformed responses,
  cassette round-trips and mutation isolation, replay modes, time-travel,
  replay-against concurrency, snapshot vectors, diffs, hostile CI strings,
  scorer families, regression alerts, and Braintrust lifecycle failures.
- Both `@agentskit/eval` and its private Braintrust implementation enforce a 95%
  line-coverage floor, strict TypeScript, dual ESM/CJS builds, and direct tests.
- Vite and Metro web/iOS fixtures exercise the portable replay conditions.
- Repository-wide gates cover all published export conditions with packed
  ESM/CJS and supported TypeScript consumers, public API snapshots, size limits,
  Doc Bridge, and README conformance.

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
5. a complete `docs/stability/eval.json` evidence manifest accepted in review;
6. stable status for every direct internal runtime/peer dependency required by
   the committed stable surface;
7. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until every gate is complete, `@agentskit/eval` and its private Braintrust
implementation remain **beta**.

## Decision requested

Review whether suite isolation, replay integrity/portability, numeric contracts,
CI safety, and optional Braintrust lifecycle are narrow enough for a stable
commitment. Acceptance records the intended freeze; it does not waive ADR 0024
or authorize promotion before publication, soak, releases, evidence,
dependencies, and 1.0.0 are complete.
