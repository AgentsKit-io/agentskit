# @agentskit/statechart conventions

## Owns

- Framework-neutral interaction-state definitions and instances.
- Pure deterministic transition semantics.
- Versioned snapshot serialization and runtime-validated restore.
- Typed transition, restore, and observer diagnostics.

## Does not own

- Agent or tool execution, effects, retries, persistence, event delivery, or deduplication.
- Runtime flows or durable step logs.
- ChatController orchestration.
- UI components or bindings for React, React Native, Vue, Svelte, Angular, or Ink.
- Product-specific states, policies, or business logic.

## Constraints

- Zero runtime dependencies.
- Instances and snapshots contain JSON-compatible data only.
- No hidden clock, randomness, IO, or global mutable state.
- New or breaking public contracts require an ADR.
- Public APIs use named exports and explicit return types; never `any`.
- Maintain at least 90% line coverage.
