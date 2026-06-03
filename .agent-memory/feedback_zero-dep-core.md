---
name: feedback_zero-dep-core
description: core takes zero runtime deps; heavy deps live in opt-in packages behind injection points
metadata:
  type: feedback
---

**Fact:** `@agentskit/core` has zero runtime dependencies and must stay under
~10 KB gzipped. Enforced by `scripts/check-core-no-deps.mjs`.

**Why:** Core is the stable foundation every other package depends on; a dep in
core is a dep for the whole ecosystem. Keeping it pure keeps the framework
plug-and-play and tree-shakeable.

**How to apply:** When a feature needs a third-party lib (Ajv, Langfuse, an
HTTP client, etc.), do NOT add it to core. Define a contract/injection point in
core (e.g. the `ArgsValidator` type + `validateArgs` option) and ship the
implementation in a separate opt-in package (`@agentskit/validation`,
`@agentskit/observability-langfuse`, …). Default behaviour with no injection
must be a safe passthrough.

**Related:** [[feedback_json-schema-canonical]], [[reference_quality-gates]]
