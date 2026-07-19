# Conventions — `@agentskit/validation`

Opt-in runtime validation of tool-call arguments against each tool's existing
JSON Schema. Ajv-backed implementation of core's `ArgsValidator` contract
(ADR-0008). Workspace package is **private**; consumers reach it through
`@agentskit/tools/validation`.

`ArgsValidator` is pinned by ADR-0008. Changes to the contract belong in core
and require the ADR process.

## Scope

- **`createAjvValidator(options?)`** — returns an `ArgsValidator` for
  `validateArgs` on chat controllers / runtime
- **Options** — recursive ordinary-object hardening through
  `rejectAdditionalProperties` (default `false`), `coerceTypes` (default
  `false`), optional pre-configured `ajv` instance
- Compiled validators cached by schema identity (`WeakMap`)
- Invalid args surface as structured validation errors
  (`AK_TOOL_INVALID_INPUT` path via core) before `execute` runs

## What does NOT belong here

- Zod or any parallel schema DSL — JSON Schema stays the single source of truth
- Changing the `ArgsValidator` contract itself → `@agentskit/core` + ADR
- UI, adapters, or tool implementations
- Making validation mandatory in core (must remain opt-in so core stays
  zero-dependency)

## Implementation constraints

- Named exports only.
- Do not add runtime deps beyond Ajv + `@agentskit/core`.
- Tools without a `schema` are skipped (passthrough).
- Prefer failing closed on invalid args; do not silently rewrite payloads unless
  `coerceTypes` is explicitly enabled.
- Keep defaults permissive on additional properties — models often emit
  harmless extras; strict mode is opt-in.
- Strict-extra hardening must not mutate caller schemas. Preserve explicit
  `additionalProperties` policies and do not synthesize a closed property set
  across draft-07 composition/applicator boundaries.
- Ajv coercion can mutate the argument object. A supplied Ajv instance owns its
  Ajv configuration; package options do not reconfigure it.
- Schemas are trusted application configuration. Compilation errors propagate;
  argument-validation messages must never include argument values.

## Testing

- Unit tests cover nested schemas, refs, compositions, paths, failures, options,
  and cache behavior. Package tests assert the public tools subpath. No network.
- Configured line coverage threshold: **90**.

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Introducing Zod "for convenience" | Validate the tool's existing JSON Schema |
| Turning validation on by default in core | Keep Ajv here; core accepts `validateArgs` optionally |
| Recompiling Ajv on every call | Cache by schema object identity |
| Rejecting extra keys by default | Leave `rejectAdditionalProperties` false unless the contract is strict |
| Throwing bare `Error` | Return / raise through the typed validation error path |

## Review checklist for this package

- [ ] Coverage threshold holds (90% lines)
- [ ] Still implements core `ArgsValidator` only
- [ ] No new schema DSL or duplicate contract
- [ ] Defaults remain opt-in and non-coercing
- [ ] Public import story stays `@agentskit/tools/validation`
- [ ] Package remains private workspace implementation
