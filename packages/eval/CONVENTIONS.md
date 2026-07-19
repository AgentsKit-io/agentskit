# Conventions — `@agentskit/eval`

Agent evaluation and benchmarking. Treats agents like production systems — scored, regressed-against, tracked over time.

## Stability tier: `beta`

Core `runEval(dataset)` is stable. Reporters, metrics, dataset shape may gain fields in minor bumps.

## Scope

- `runEval({ agent, suite })` — runs an `EvalSuite` sequentially and returns an `EvalResult`
- Deterministic cassette recording, replay, time travel, and replay-against comparison
- Prompt snapshot, diff, attribution, JUnit, Markdown, and GitHub Actions reporting
- Braintrust quality/robustness scoring through the optional `braintrust` peer
- Types: `AgentFn`, `AgentResponse`, `RunEvalConfig`, `EvalSuite`, `EvalResult`

## Design principles

- **Evaluation is testing for non-determinism.** Consumers should use `vitest` or similar as the runner; this package provides the primitives.
- **Evaluation input is read-only.** Runners and replay helpers snapshot mutable data at their boundaries.
- **Malformed agent output becomes a failed case.** One bad case does not abort the suite.
- **Every metric is optional.** Latency and token usage are reported when available.
- **Host boundaries are explicit.** `replay` is universal; `replay/io`, `snapshot`, and `ci` use Node filesystem/process APIs.
- **Replay-first** (future): when deterministic replay lands, eval runs should be reproducible from a recorded trace.

## Adding a public surface

1. Extend an existing subpath unless a distinct host boundary requires a new one.
2. Keep browser/React Native entries free of Node built-ins.
3. Add package-manifest, packed-consumer, ESM/CJS, declaration, and direct behavior tests.
4. Update README, for-agents documentation, and the public API snapshot.

## Testing

- Unit tests for scorers and aggregation with deterministic fixtures.
- Integration test that runs a tiny dataset against a mock runtime end-to-end.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Blocking tests on real model calls | Use deterministic mock adapters |
| Assuming every result has token usage | Make metrics optional |
| Importing filesystem helpers in browser code | Use `serializeCassette` / `parseCassette` with host storage |
| Mutating suites or cassettes | Snapshot at the package boundary |

## Review checklist for this package

- [ ] Bundle size under 10KB gzipped
- [ ] Coverage threshold holds (95% lines)
- [ ] Root plus all eight subpaths pass packed ESM/CJS/TypeScript consumers
- [ ] Browser and React Native replay entries contain no eager Node built-ins
- [ ] No hard dependency on an adapter, model provider, or optional Braintrust SDK
