# ADR 0013 — Runtime validation for serialized message records

- Status: Accepted
- Date: 2026-07-11
- Supersedes: —
- Related issues: #1135

## Context

`@agentskit/core` exports the canonical `MemoryRecord`, `Message`, `ContentPart`, and `ToolCall` contracts plus serialization helpers. Consumers that receive a serialized record from storage or a network boundary currently have no canonical runtime validator. Reconstructing the message graph in downstream schema libraries causes drift, while casting untrusted data makes `deserializeMessages` unsafe at boundaries.

Core must remain zero-dependency, browser/edge compatible, and under its bundle budget. Recursive validators can also overflow or consume unbounded work on cyclic or deeply nested metadata and tool arguments.

## Decision

Core exports `validateMemoryRecord(input: unknown): MemoryRecord` from the tree-shakeable `@agentskit/core/memory-validation` subpath, keeping the main entrypoint size unchanged.

The function validates version 1 records and the complete serialized message graph, including content parts, tool calls, JSON metadata/arguments, and ISO timestamps. JSON containers are walked iteratively with cycle detection and fixed depth/node limits. Invalid input throws `ConfigError` with `AK_CONFIG_INVALID`; raw values are not included in the public message.

`deserializeMessages` remains backward compatible and does not implicitly validate. Trust-boundary callers explicitly validate before deserializing.

## Rationale

An additive subpath provides one canonical validator without increasing the main entrypoint or changing trusted-call behavior.

## Alternatives considered

1. Add Zod to core — rejected because core has a zero-runtime-dependency contract.
2. Put the schema only in AgentsKit Chat — rejected because the canonical message graph belongs to AgentsKit and would drift.
3. Make `deserializeMessages` validate automatically — rejected because it would change existing behavior and cost for trusted in-memory callers.
4. Recursive validation — rejected because cyclic and deeply nested inputs can overflow the stack.

## Consequences

- Downstream transports reuse one canonical runtime validator.
- Existing serialization and deserialization behavior remains compatible.
- Validation is bounded and safe for untrusted object graphs.
- Core bundle size increases slightly and remains subject to the existing size gate.

## Open questions

None.

## References

- ADR 0003 — Memory contract
- ADR 0008 — Runtime argument validation
