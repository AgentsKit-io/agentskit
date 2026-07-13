# ADR 0020 — Serializable interaction state

- Status: Accepted
- Date: 2026-07-13
- Supersedes: —
- Related issues: #1199

## Context

Interactive agent surfaces need a small way to represent deterministic, resumable interaction state. That concern is narrower than the Runtime flow and durable-execution facilities and independent from Core's `ChatController`: it does not execute agents, call tools, render UI, persist data, or select providers.

Putting this primitive in Core would expand Core's contract and bundle. Putting it in Runtime would couple UI-facing interaction state to an execution engine. Reimplementing it in every framework adapter would produce incompatible snapshots and transition semantics.

## Decision

Create a zero-runtime-dependency `@agentskit/statechart` package with a framework-neutral contract:

- a statechart definition has an identifier, a definition version, an explicit initial state, named states, and event transitions;
- definitions are validated once and frozen by the package;
- instances contain only JSON-compatible context plus machine identity, current state, revision, and host-supplied identity/time metadata;
- transitions are synchronous and pure. They return an `accepted` or `rejected` discriminated union and never perform IO;
- guards and reducers are optional deterministic functions. Exceptions and invalid reducer output become typed rejections;
- context parsing is injected into the definition and is applied at creation, after reduction, and during restore;
- snapshots carry a package-owned schema version and are restored from `unknown` through runtime validation;
- instance IDs and timestamps are supplied by the host. The package does not read a clock or generate randomness;
- observers are notified only through a separate helper after a transition result exists. Observer failure cannot alter transition state.

The package does not provide persistence, effects, action execution, retries, deduplication, business-specific phases, UI components, provider integration, or agent-loop integration.

## Rationale

An independent package lets React, React Native, Vue, Svelte, Angular, Ink, and non-UI consumers share one state and snapshot contract without pulling in an execution engine. JSON-only instances remain portable across runtimes and storage adapters. Host-supplied nondeterministic values make replay and tests reproducible.

Requiring a parser instead of choosing a schema library keeps the package dependency-free and lets consumers use their existing validator. A separate observer boundary preserves a pure transition function.

## Consequences

- Consumers must provide an instance ID, timestamps, and a context parser.
- Guards and reducers must remain deterministic if replay equivalence is required.
- Event delivery deduplication and persistence are host responsibilities.
- Definition functions are runtime configuration and are not part of serialized snapshots.
- The initial release is alpha while downstream framework integrations exercise the contract.
- Runtime flows remain the correct abstraction for durable execution, DAGs, tool calls, and side effects.

## Alternatives considered

- **Add the primitive to Core.** Rejected because it expands the smallest, most widely installed package for an optional concern.
- **Add it to Runtime.** Rejected because interaction state does not require an agent execution engine.
- **Adopt an external state-machine runtime.** Rejected for the initial contract because the required subset is small and a dependency would increase bundle and interoperability constraints.
- **Serialize functions or full definitions.** Rejected because functions are not portable data and restore should bind a snapshot to trusted runtime configuration.

## Open questions

- Whether a later package should provide opt-in adapters for a specific schema library.
- Whether replay helpers belong here after real downstream use, or in a separate testing package.

## References

- [Issue #1199](https://github.com/AgentsKit-io/agentskit/issues/1199)
- [ADR 0006 — Runtime contract](./0006-runtime-contract.md)
- [ADR 0009 — Composition and dependency rules](./0009-composition-rules.md)
