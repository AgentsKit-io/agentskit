# Conventions — `@agentskit/eval`

Agent evaluation and benchmarking. Treats agents like production systems — scored, regressed-against, tracked over time.

## Stability tier: `beta`

Core `runEval(dataset)` is stable. Reporters, metrics, dataset shape may gain fields in minor bumps.

## Scope

- `runEval({ runtime, dataset, concurrency })` — runs a dataset, returns a report
- Scoring helpers (exact-match, regex, LLM-as-judge)
- Reporters (console, JSON file; more coming)
- Types: `EvalCase`, `EvalReport`, `ScoreFn`

## Design principles

- **Evaluation is testing for non-determinism.** Consumers should use `vitest` or similar as the runner; this package provides the primitives.
- **Scores are numbers in `[0, 1]`.** Boolean outcomes coerce (`true` → 1, `false` → 0).
- **Every metric is optional**. Latency, cost, tokens — report if available, skip otherwise.
- **Replay-first** (future): when deterministic replay lands, eval runs should be reproducible from a recorded trace.

## Adding a metric

1. Add the field to `EvalReport` in `src/types.ts`.
2. Compute it in `runEval`'s aggregation loop.
3. Make it optional — some runtimes/adapters won't have it.
4. Document in the package README.

## Adding a reporter

1. Create `src/reporters/<name>.ts`.
2. Export a factory: `export function jsonReporter(opts): Reporter`.
3. `Reporter` has `onCase(case, result)` and `onComplete(report)` events.
4. Keep it synchronous where possible; non-blocking where not.

## Testing

- Unit tests for scorers and aggregation with deterministic fixtures.
- Integration test that runs a tiny dataset against a mock runtime end-to-end.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Blocking tests on real model calls | Use deterministic mock adapters |
| Assuming every result has `tokensUsed` | Make metrics optional |
| Scoring via string equality on LLM outputs | Use LLM-as-judge for fuzzy outputs |
| Mutating input dataset | Treat `EvalCase[]` as read-only |

## Review checklist for this package

- [ ] Bundle size under 10KB gzipped
- [ ] Coverage threshold holds (95% lines — mostly pure logic)
- [ ] New metric documented in README
- [ ] No hard dependency on any one adapter or reporter
