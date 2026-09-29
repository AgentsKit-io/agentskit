# ADR 0038 — Canonical JSON and SHA-256 helpers

- **Status**: Accepted
- **Date**: 2026-09-29
- **Related ADRs**: ADR 0025

## Context

Several packages implemented canonical JSON and SHA-256 separately. Their
serialization differed for `undefined`, property ordering, and values that are
not JSON data. Persisted audit-chain entries and evaluation cassettes also rely
on fingerprints remaining stable across releases.

## Decision

Expose `canonicalJson` and `sha256Hex` from the opt-in
`@agentskit/core/hash` subpath. Canonical JSON follows RFC 8785; undefined object
properties are omitted and undefined array entries follow JSON round-trip
behavior. The helper is not re-exported from the main `@agentskit/core` entry.
Use it in the CLI audit chain and evaluation replay fingerprints, retaining
fixtures for hashes already persisted by the previous implementations.

Build-time dependencies are bundled into this subpath. The published core
package keeps zero runtime dependencies, and its main entry remains under its
10 KB gzip budget.

## Consequences

- New consumers use this subpath instead of local canonicalization and hashing
  implementations.
- Hash compatibility is checked against committed legacy fixtures.
- Inputs outside the JSON data model fail instead of receiving an accidental
  or implementation-specific serialization.

## Alternatives considered

- Reimplement RFC 8785 locally: rejected because it would preserve another
  custom serializer.
- Add the helpers to the main entry: rejected to keep optional hashing out of
  the core runtime bundle.

## Open questions

- None.

## References

- [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
