---
"@agentskit/validation": minor
"@agentskit/core": minor
"@agentskit/runtime": minor
---

Runtime argument validation (ADR-0008). Tool-call args produced by a model can now be validated against the tool's existing JSON Schema before `execute` runs.

- New package `@agentskit/validation` exposing `createAjvValidator()` — an Ajv-backed `ArgsValidator`.
- `@agentskit/core` adds the `ArgsValidator` contract and a `validateArgs` option on the chat controller (default passthrough; core stays zero-dependency). Invalid args raise `AK_TOOL_INVALID_INPUT`.
- `@agentskit/runtime` adds the matching `validateArgs` option on `RuntimeConfig`.

Opt-in: omit `validateArgs` and behaviour is unchanged.
