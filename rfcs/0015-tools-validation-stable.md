# RFC 0015 — `@agentskit/tools/validation` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: AgentsKit Contributors
- **Public surface**: `@agentskit/tools/validation`
- **Implementation**: private workspace package `@agentskit/validation`
- **Related**: [ADR 0008](../docs/architecture/adrs/0008-runtime-validation.md), [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md)

## Summary

This RFC proposes the validation subpath commitment for a future stable
`@agentskit/tools` release. The implementation package is deliberately private:
it is not independently published or promoted. This proposal does not promote
`@agentskit/tools`, publish a release, or claim that soak, adoption, dependency,
or evidence gates have elapsed.

## Proposed stable commitment

- `createAjvValidator(options?)` remains a named export from
  `@agentskit/tools/validation` and implements core's ADR-0008 `ArgsValidator`.
- Runtime validation remains opt-in. Tools without a schema remain passthrough,
  and Ajv never enters `@agentskit/core`.
- Default validation does not coerce arguments or close additional properties.
- `coerceTypes: true` delegates to Ajv and may mutate the supplied argument
  object. A supplied Ajv instance owns its Ajv configuration.
- `rejectAdditionalProperties: true` recursively closes ordinary object
  boundaries that omit an explicit policy, without mutating caller schemas.
  Explicit policies are preserved. Draft-07 composition/applicator boundaries
  remain authored policy because a combined property set cannot be inferred
  safely; consumers close those boundaries explicitly.
- Invalid model arguments return structured, value-free errors. Required and
  additional-property failures identify the field; array indices and escaped
  JSON Pointer segments remain unambiguous.
- Schemas are trusted application configuration, compiled lazily, and cached by
  object identity. Invalid schemas propagate as configuration failures.

Removing the subpath, changing opt-in/default coercion behavior, mutating source
schemas during hardening, echoing argument values, or weakening the committed
field-path behavior requires the breaking-change process once stable.

## Evidence already implemented

- Unit/adversarial coverage for nested objects and arrays, local references,
  composition, explicit dictionary policies, schema immutability, error paths,
  multiple errors, custom Ajv ownership, cache isolation, compilation failure,
  and value-free fallback errors.
- Package contract tests prove the implementation stays private and the public
  ESM/CJS/types route belongs to `@agentskit/tools/validation`.
- Repository API and packed-consumer matrices cover the public tools subpath.

## Gates that remain open

This hardening must first ship in a new `@agentskit/tools` beta minor. Stable
promotion remains blocked until all package-level ADR 0024/0025 requirements
for `@agentskit/tools` are met, including:

1. publication of this or an equivalent beta hardening line;
2. at least 90 consecutive beta days after the last breaking change;
3. at least two released beta minor lines during that clean window;
4. acceptance of the appropriate tools promotion RFC set, including this
   validation-subpath commitment;
5. reviewed stability evidence for the complete public tools surface;
6. stable direct internal runtime/peer dependencies required by that surface;
7. coordinated `@agentskit/tools` 1.0.0 metadata, policy, and release changes.

The private `@agentskit/validation` version and badge do not create a separate
promotion clock or public compatibility promise.

## Decision requested

Review whether this narrow opt-in validation contract is suitable for inclusion
in a future stable tools surface. Acceptance records the intended freeze only;
it does not waive any package-level promotion gate.
