# Conventions — `@agentskit/runtime`

The conductor. Implements the Runtime contract ([ADR 0006](../../docs/architecture/adrs/0006-runtime-contract.md)) with all fourteen invariants.

## Scope

- `createRuntime(config)` factory and the `run(task, options?)` method
- Delegation materialized as dynamic tools
- Shared context passed down to delegates
- The agent loop implementation (actual ReAct cycle)

## What does NOT belong here

- LLM provider code → `@agentskit/adapters`
- Tool implementations → `@agentskit/tools`
- Skill definitions → `@agentskit/skills`
- UI → `@agentskit/react` or `@agentskit/ink`

## Adding a new capability

The runtime surface is deliberately small. Before adding anything:

1. Can this be an **Observer**? Prefer that — observers are read-only and composable.
2. Can this be a **wrapper runtime**? Wrap `createRuntime` and expose the same `run()` method.
3. Is this a new contract? Open an RFC and an ADR first.

If you still need to change the runtime internals, keep the RT invariants intact.

## The fourteen invariants

Every change in this package is reviewed against RT1–RT14 in [ADR 0006](../../docs/architecture/adrs/0006-runtime-contract.md):

- RT1 Pure config, no I/O in `createRuntime`
- RT2 One method: `run(task, options?)`
- RT3 Options override config, never silent merge
- RT4 Hard `maxSteps` cap
- RT5 Tool resolution order well-defined
- RT6 Confirmation refuse-by-default
- RT7 Memory atomic at run boundary
- RT8 Retrieval per-turn, not per-step
- RT9 Observers read-only
- RT10 Delegation as tool
- RT11 Bounded delegation depth
- RT12 Deterministic `RunResult` shape
- RT13 Abort prompt and clean
- RT14 Errors categorized

Any PR that touches the loop must argue why each invariant still holds.

## Testing

- Unit tests for isolated primitives (`delegates`, `shared-context`)
- Integration tests use mock adapters (no real network)
- Every observer event has a test asserting it fires at the right time
- Abort tests are mandatory for any change to the loop

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Silent array merging between config and options | Explicit override; document the resolution order (RT3) |
| Soft `maxSteps` cap (user-overridable at runtime) | Hard cap. Document generous defaults instead. |
| Catching tool errors and treating them as adapter errors | Feed back to the model; don't terminate the loop (RT14) |
| Saving memory on failure "for audit" | Use an observer for audit; memory saves only on success (RT7) |
| Throwing from observers | Catch inside the runtime; observer failures don't break the loop (RT9) |

## Review checklist for this package

- [ ] Bundle size under 15KB gzipped
- [ ] Coverage threshold holds (90% lines — this is the conductor)
- [ ] Each of RT1–RT14 still holds (argue in PR description if a change touches them)
- [ ] New public API has a test for happy path + error path + abort path
- [ ] No new runtime primitive without an RFC
