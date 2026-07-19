# ADR 0027 — Statechart beta safety boundaries

- Status: Accepted
- Date: 2026-07-17
- Supersedes: —
- Related issues: #1199

## Context

ADR 0020 established a dependency-free interaction-state contract with pure transitions and runtime-validated snapshots. Beta consumers need the boundary to remain deterministic when JavaScript inputs contain prototype-sensitive keys, sparse or decorated arrays, accessors, proxies, invalid host metadata, exhausted revisions, or asynchronous observer callbacks.

Ordinary object maps mishandle valid keys such as `__proto__`. JSON serialization silently changes sparse arrays, accessors can execute while validation is inspecting untrusted data, and a promise returned from a callback typed as `void` can reject outside synchronous error isolation. These are contract questions rather than implementation-only details because consumers depend on the exact accepted and rejected input sets.

## Decision

The statechart beta contract adds these boundaries:

- state and event lookup maps use null prototypes, so every valid string key is data and cannot mutate a prototype;
- the package's JSON clone accepts finite JSON values, normalizes negative zero, and requires dense undecorated arrays and ordinary data objects;
- symbol properties, array decorations, accessors, unsupported prototypes, and unsafe proxy inspection are rejected without intentionally invoking getters;
- snapshot restore remains a total operation over `unknown`: malformed input returns a frozen typed rejection instead of throwing;
- malformed events, invalid host metadata, and revisions that cannot increment within JavaScript's safe-integer range use `AK_STATECHART_INPUT_INVALID`;
- guards and reducers receive deeply frozen event and context values;
- observer callbacks are synchronous. A returned thenable is caught and reported as `AK_STATECHART_OBSERVER_FAILED`, including prevention of an unhandled rejection;
- the package remains zero-runtime-dependency and owns neither persistence nor effects.

Invalid event rejections expose only a sanitized event shape. They do not echo values that failed the JSON boundary.

## Rationale

An exact JSON boundary prevents serialization from changing accepted state. Null-prototype maps preserve interoperability across all legal event and state names. Total restore and typed host-input failures make storage and transport corruption recoverable without exception-driven control flow. Enforcing synchronous observers preserves the transition core's isolation without introducing scheduling or lifecycle ownership.

## Consequences

- Sparse arrays and objects with behavior-bearing properties must be normalized by the host before entering the package.
- Revisions stop at `Number.MAX_SAFE_INTEGER`; the host must rotate or migrate an instance rather than accept an ambiguous next revision.
- Async telemetry belongs behind a synchronous handoff owned by the host; it is not awaited by this package.
- The new input diagnostic and stricter accepted-input set ship in a new `0.x` minor.
- With packaging, adversarial tests, and documentation aligned, `@agentskit/statechart` graduates from alpha to beta. Stable promotion still requires the repository's published-minor, soak, evidence, and dependency gates.

## Alternatives considered

- **Use ordinary object maps plus key deny-lists.** Rejected because valid strings should not require an incomplete special-case list.
- **Mirror `JSON.stringify` coercions.** Rejected because silent holes, getters, and non-finite-number conversion undermine replay equivalence.
- **Await observers.** Rejected because it would make transition observation asynchronous and pull scheduling into the package's ownership boundary.
- **Throw for malformed snapshots.** Rejected because restore is explicitly the untrusted serialized-data boundary.

## Open questions

- Whether a separate future package should provide async observer queues or persistence adapters after public consumer evidence exists.

## References

- [ADR 0020 — Serializable interaction state](./0020-serializable-interaction-state.md)
- [ADR 0024 — Evidence-backed package graduation](./0024-package-graduation-evidence.md)
