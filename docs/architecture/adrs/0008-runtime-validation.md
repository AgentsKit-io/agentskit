# ADR 0008 — Runtime argument validation

- **Status**: Accepted
- **Date**: 2026-06-03
- **Supersedes**: —
- **Related issues**: —

## Context

Tool definitions carry a `JSONSchema7` (`packages/core/src/types/tool.ts`). `defineTool` infers the argument type from that schema at compile time — but it only **casts**: `return config as ToolDefinition<...>`. Nothing validates at runtime.

The real untrusted boundary in AgentsKit is **model output**, not application user input. A model returns a tool call whose `args` is an arbitrary JSON string. The runtime path is:

```
chunk.toolCall.args (string from LLM)
  → safeParseArgs()          // JSON.parse, returns {} on failure
  → execute(args)            // typed as InferSchemaType<TSchema> — but NEVER checked
```

`safeParseArgs` (`packages/core/src/primitives.ts:87`) guarantees the value is *an object*, nothing more. A model can omit required fields, send wrong types, or inject extra keys, and `execute` receives them while TypeScript believes the contract holds. Same gap on the inbound path via `adapter.parse(req)` (`packages/runtime/src/chat-trigger.ts`).

The Agents Playbook lists "typed boundaries — all external inputs validated by runtime schemas" as a non-negotiable, and separately lists "inline schemas → no single source of truth" as a failure mode.

## Decision

1. **JSON Schema stays the single canonical schema format.** Core already standardises on `JSONSchema7` for tool, manifest, agent-schema, and security taxonomy. We do **not** introduce Zod as a parallel canonical.
2. **Validation is an injectable, opt-in capability.** Core exposes a `validateArgs?: ArgsValidator` hook with a **default passthrough** (current behaviour). No validator is bundled into core; the zero-dependency contract (`scripts/check-core-no-deps.mjs`) is preserved.
3. **A new optional package `@agentskit/validation`** wraps `ajv` and provides `createAjvValidator()` returning an `ArgsValidator` that checks parsed tool args against the tool's existing `JSONSchema7`.
4. **Validation failure raises a typed error** `ToolError` with code `AK_TOOL_INVALID_ARGS`, carrying the offending field path(s) as hint. It flows through the existing didactic error system.

## Rationale

- **Single source of truth.** Validating against the schema already attached to each tool means zero duplication. A Zod-canonical approach would force every contract and every `defineTool` call to migrate, and create two schema systems — the exact failure mode the playbook warns against.
- **Zero-dep core survives.** `ajv` cannot live in core. An injection point keeps core pure; the dependency lives only in the opt-in package or userland.
- **Smallest blast radius.** Existing `defineTool` / `defineZodTool` call sites are untouched. Opting in is one line at controller/runtime construction.
- **Honours playbook intent over wording.** Intent = typed boundaries + one source of truth. Both satisfied without Zod.

## Consequences

- New public contract: `ArgsValidator` type + `validateArgs` option on the chat controller and runtime.
- New error code `AK_TOOL_INVALID_ARGS` (additive — minor bump).
- New package `@agentskit/validation` (peer-deps `ajv`).
- Default behaviour unchanged: callers who do not pass a validator get today's passthrough. Documented as opt-in; turning it on is recommended for production.
- Inbound `adapter.parse(req)` validation is **out of scope** here; covered when an HTTP-surface ADR lands. Flagged in `docs/security/threat-model.md`.

## Alternatives considered

- **Zod as canonical.** Rejected: duplicates the JSON-Schema surface, breaks the deliberate opt-in `defineZodTool` design, mass migration, conflicts with zero-dep core.
- **Validate inside core with a bundled validator.** Rejected: violates the zero-dependency contract and the <10 KB budget.
- **Do nothing / document caller responsibility.** Rejected: leaves the "typed boundaries" non-negotiable violated; the type signature actively lies.

## Open questions

- Default-on once `@agentskit/validation` is stable? Revisit after one release of field data.
- Whether to expose a JSON-Schema → friendly-message formatter for end-user surfaces.

## References

- `packages/core/src/primitives.ts` (`safeParseArgs`)
- `packages/core/src/types/tool.ts` (`defineTool`, `JSONSchema7`)
- `packages/tools/src/zod.ts` (`defineZodTool` — opt-in zod, unchanged)
- Agents Playbook — non-negotiables; failure modes
