# ADR-0014: Trusted application tool-call proposal

**Status:** Accepted

**Date:** 2026-07-11

## Context

The chat controller already owns tool argument validation, confirmation state, approval, denial, and execution. Trusted application UI can initiate an action outside a model stream, but the public controller has no supported way to place that action into the existing confirmation lifecycle.

Without a core seam, framework integrations must inject message state, encode hidden prompts, or create a parallel tool executor.

## Decision

Add `proposeToolCall` to `ChatController` and every framework `ChatReturn`, plus the equivalent tree-shakeable helper at `@agentskit/core/tool-proposal`. It accepts a canonical tool-call id, registered tool name, and parsed arguments.

The controller requires the tool to exist, expose an execute function, opt into `requiresConfirmation`, and pass the configured `ArgsValidator` when a schema is present. A valid proposal appends one canonical assistant tool call in `requires_confirmation` state and returns it without executing.

Proposal ids are idempotency keys. Reusing an existing id returns the existing call without changing its identity, arguments, status, or result. `approve` and `deny` remain the only continuation paths.

The canonical call is committed before `onToolCall`, matching model-originated calls and reserving the id against concurrent or reentrant proposals. If that hook rejects, the call transitions to terminal `error`, the proposal promise rejects, and later approval cannot execute it.

All framework bindings expose the same additive method. The controller lazy-loads the implementation while retaining exclusive access to its current tool map, validator, and `onToolCall` hook. This preserves the strict 10 KB default core budget; consumers pay the implementation cost only when they invoke the proposal capability.

## Alternatives considered

1. Inject messages through framework hooks — rejected because hooks intentionally do not expose controller mutation.
2. Send an internal user prompt — rejected because it pollutes transcript semantics and delegates trusted intent to an adapter.
3. Execute application actions outside the controller — rejected because it duplicates validation, confirmation, lifecycle, and events.

## Consequences

- Trusted apps can enter the same confirmation lifecycle as model-produced calls.
- No additional executor or validator is introduced.
- The additive method slightly increases the core public surface and bundle size.
- Authorization, token binding, expiry, audit, and application policy remain outside core.
