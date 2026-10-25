# ADR 0040 — Preserve eval replay fingerprint compatibility

- **Status**: Proposed
- **Date**: 2026-09-30
- **Related ADRs**: ADR 0038

## Context

`fingerprintRequest` fingerprints a deliberate projection of `AdapterRequest`:
provider-visible message and context fields, including tool schemas but excluding
executable tool callbacks and volatile message identity. Existing cassette
fingerprints are persisted and strict replay compares them directly.

The projection's serializer is observably different from
`@agentskit/core/hash`'s RFC 8785 `canonicalJson`: dates use a `{"$date": ...}`
tag; undefined array entries, non-finite numbers, cycles, and unsupported
objects reject with eval `ConfigError`; and integer-like keys are emitted in
JavaScript property enumeration order. `canonicalJson` emits dates as ISO
strings, maps undefined array entries to `null`, orders keys canonically,
accepts a `Map` as `{}`, and throws generic `Error` values for non-finite
numbers and cycles. Hashing an unprojected request would also include
executable callbacks, which are not replay input.

## Decision

Keep the eval projection and serializer unchanged. Do not replace them with
`canonicalJson` until a versioned cassette/fingerprint migration can preserve
persisted fingerprints and rejection behavior. Retain literal fingerprint and
record/serialize/parse/strict-replay regression coverage for the current
contract.

## Consequences

- ADR 0038's migration to core hashing applies to eval only after compatibility
  is demonstrated or a versioned migration is approved.
- New eval fingerprint behavior must account for the persisted v1 cassette
  contract; core canonical JSON remains the default for new JSON hashing.
- Documentation and regression tests are sufficient for this compatibility
  decision; no runtime behavior or public API changed.
