# ADR 0039 — Cryptographic IDs for generated identifiers

- **Status**: Accepted
- **Date**: 2026-09-29
- **Related ADRs**: ADR 0025

## Context

Generated IDs across packages used timestamps, counters, or `Math.random()`.
Those approaches do not provide a single collision-resistant contract and can
produce IDs with different formats.

## Decision

`@agentskit/core` exposes `createId(prefix)`, which returns the prefix and a
UUID from the platform's `crypto.randomUUID()`. Existing `generateId(prefix)`
keeps its export and prefix contract while delegating to `createId`. Packages
that need generated run, server, or temporary-file IDs use this helper.

## Consequences

- Generated IDs share the UUID v4 format and require a runtime with
  `crypto.randomUUID()`.
- Existing identifiers remain valid strings with their original prefixes,
  but the suffix format changes from timestamp/counter to UUID.
- IDs are not deterministic. Callers needing stable identifiers must supply
  them explicitly.

## Alternatives considered

- Keep package-local ID generators: rejected because their formats and
  collision properties diverge.
- Keep timestamps and counters: rejected because they are not random and
  repeat across processes.

## Open questions

- None.
