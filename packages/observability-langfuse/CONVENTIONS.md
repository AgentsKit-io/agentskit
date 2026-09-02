# Conventions — `@agentskit/observability-langfuse`

Provider integration for Langfuse. Pairs with the `Observer` primitive from `@agentskit/core` and the span tracker from `@agentskit/observability`.

## Stability tier: `beta`

Adapter contract is stable. Breaking changes upstream in the `langfuse` SDK may force minor bumps.

## Scope

- One Langfuse `trace` per serialized agent run.
- Nested `span` / `generation` objects per AgentsKit event.
- Token and latency metadata are forwarded; cost is not normalized by this adapter.
- HITL is not emitted until it exists in the canonical `AgentEvent` contract.
- Env-driven config (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`).

## Observer is read-only

Per runtime RT9: the observer cannot mutate messages, tool calls, or results. Logging and span emission only.

## Adding a new mapping

1. Extend the `case` block in `@agentskit/observability/trace-tracker` first — that is the source of truth.
2. Map the new attribute in `langfuse.ts`'s `startRemote` / `endRemote`.
3. Cover with a unit test using the in-memory mock client (see `tests/langfuse.test.ts`).

## Testing

- Unit tests mock the `langfuse` SDK; do not hit the network.
- Errors from the SDK are swallowed and asserted via `expect(...).not.toThrow()`; `onError` is the optional isolated error sink.
- Await the observer's `flush()` or `shutdown()` during graceful termination; process exit alone is not a delivery guarantee.
