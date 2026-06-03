# ADR 0011 — Inbound request validation (chat triggers)

- **Status**: Accepted
- **Date**: 2026-06-03
- **Supersedes**: —
- **Related issues**: —

## Context

`createChatTrigger` (`@agentskit/runtime`) turns inbound webhooks (Slack,
Discord, Teams, …) into agent runs. The pipeline is:

```
req → adapter.verify(req)   // signature + replay (required in strict mode)
    → adapter.parse(req)    // → ChatSurfaceEvent | null
    → agent.run(buildTask(event), buildContext(event))
```

`verify` authenticates the *sender*. But the parsed `ChatSurfaceEvent` shape was
trusted thereafter — a malformed or unexpected payload from a verified-but-buggy
source (or a surface whose adapter under-validates) reaches `agent.run`. That is
threat #8 in `docs/security/threat-model.md`. ADR-0008 already established
`ArgsValidator` + JSON Schema as the way AgentsKit validates untrusted input at
runtime; the inbound surface should reuse it rather than invent a second
mechanism.

## Decision

**Add opt-in schema validation of the parsed event**, reusing the ADR-0008
contract. `ChatTriggerOptions` gains:

- `eventSchema?` — a `JSONSchema7` for the `ChatSurfaceEvent`
  (typed as `Parameters<ArgsValidator>[0]` to avoid adding a `json-schema`
  dependency to runtime).
- `validateEvent?` — an `ArgsValidator` (e.g. `createAjvValidator()` from
  `@agentskit/validation`).

When **both** are set, the trigger validates the event immediately after
`parse` (and the `null` check) and before `filter`/`agent.run`. On failure it
emits a `rejected` observer event and returns **HTTP 400** with the validator's
message. With neither (or only one) set, behaviour is unchanged — pure
passthrough, no new dependency pulled in.

## Rationale

- **Defence in depth.** `verify` covers authenticity; `eventSchema` covers
  shape/content. Both are cheap and independent.
- **One validation mechanism.** Same `ArgsValidator` contract and
  `@agentskit/validation` implementation as tool args (ADR-0008) — nothing new
  to learn, JSON Schema stays canonical.
- **Zero forced cost.** Opt-in, and runtime gains no dependency (the schema type
  is derived from the existing `ArgsValidator` type).

## Consequences

- `ChatTriggerOptions` adds `eventSchema` + `validateEvent` (additive, minor).
- Invalid inbound events are rejected at the edge with 400 instead of reaching
  the agent.
- Validating the **raw request body** (pre-parse) is still the adapter's job;
  this ADR covers the normalized event. A raw-body schema can be layered later
  if a surface needs it.

## Alternatives considered

- **Validate inside each adapter.** Rejected: every adapter would re-implement
  it; the trigger is the one chokepoint that all surfaces pass through.
- **A bespoke validator interface.** Rejected: `ArgsValidator` already exists and
  fits; a second contract violates "contracts defined once" (ADR-0009).
- **Always-on validation.** Rejected: would force a validator dependency and a
  schema for every surface; opt-in keeps the default path dependency-free.

## References

- `packages/runtime/src/chat-trigger.ts`
- ADR-0008 (runtime validation / `ArgsValidator`), ADR-0009 (composition rules)
- `docs/security/threat-model.md` (threat #8)
