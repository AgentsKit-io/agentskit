# ADR 0001 — Adapter Contract

- **Status**: Accepted
- **Date**: 2026-04-14
- **Supersedes**: —
- **Related issues**: #214

## Context

An **Adapter** is how AgentsKit talks to a language-model provider. It is the seam between application code (controllers, hooks, runtime loops) and an external service (OpenAI, Anthropic, Ollama, a local model, a mock for tests).

As the Fase 3 roadmap will add 10+ adapters (Mistral, Cohere, Together, Groq, Fireworks, Replicate, OpenRouter, Bedrock, Azure OpenAI, Vertex AI, xAI/Grok, HuggingFace, local models), we need a **formal, versioned contract** that:

- Makes "plug-and-play" verifiable, not aspirational
- Lets contributors add a new adapter without reading all of core
- Survives breaking changes via a deprecation cycle
- Can be validated at runtime by a future `ContractValidator` (see #214 follow-ups)

Today the contract is implicit in `packages/core/src/types/adapter.ts`. This ADR promotes it to a first-class artifact.

## Decision

The Adapter contract consists of four types plus one invariant per method:

### Core types

```ts
export interface AdapterContext {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  metadata?: Record<string, unknown>
}

export interface AdapterRequest {
  messages: Message[]
  context?: AdapterContext
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'reasoning' | 'error' | 'done'
  content?: string
  toolCall?: StreamToolCallPayload
  metadata?: Record<string, unknown>
}

export interface StreamSource {
  stream: () => AsyncIterableIterator<StreamChunk>
  abort: () => void
}

export type AdapterFactory = {
  createSource: (request: AdapterRequest) => StreamSource
}
```

### Invariants

An implementation MUST satisfy the following to be a conformant Adapter:

**A1. Pure factory.** `createSource` is synchronous and side-effect-free. It returns a `StreamSource` but does NOT start any network or compute work until `stream()` is called for the first time.

**A2. Single iteration.** `stream()` may be called once per `StreamSource`. Calling it a second time is undefined behavior. Consumers needing a re-run must call `createSource` again.

**A3. Terminal chunk.** Every stream ends with exactly one of:
- A chunk with `type: 'done'` (success), or
- A chunk with `type: 'error'` and `metadata.error: Error` (failure), or
- The iterator returning from a caller-initiated `abort()`.

An adapter MUST NOT end silently without one of these signals.

**A4. Chunk purity.** Chunks are independently meaningful. A consumer must be able to process `type: 'text'` chunks without buffering for a later `done` — the text is already emitted.

**A5. Tool-call atomicity.** When emitting a `type: 'tool_call'` chunk, `toolCall.id`, `toolCall.name`, and `toolCall.args` must all be present and complete. Streaming partial args via multiple `tool_call` chunks with the same `id` is NOT part of v1 of this contract (see Future Work below).

**A6. Abort is safe.** Calling `abort()` at any time (before, during, or after streaming) must not throw. If called mid-stream, the iterator should terminate promptly; no further chunks are expected.

**A7. No mutation of input.** The `messages` array passed in `AdapterRequest` must not be mutated by the adapter.

**A8. Metadata is optional but typed.** The `metadata` field on any type is `Record<string, unknown>`. Adapters may put provider-specific data there (e.g., raw response, token usage, finish reason), but consumers must not depend on its shape.

**A9. Errors do not throw.** A conformant adapter reports failures via an `error` chunk, not by throwing from `stream()`. Throwing is reserved for programmer errors (bad arguments, missing API key at construction time).

**A10. No hidden configuration.** All configuration must be accepted at adapter construction (the factory that produces `AdapterFactory`). `AdapterContext` is the only per-request configuration channel.

### Versioning

This contract is **v1** of the Adapter interface, semver'd independently from package versions. Breaking changes require:

1. A new ADR (`0001-adapter-contract-v2.md`) that references and supersedes this one
2. A major version bump of `@agentskit/core`
3. A deprecation cycle (see the Semver Policy ADR, forthcoming) — v1 adapters must continue to work for at least one minor release of core

### Stability tier

- **Tier**: `stable`
- **Guarantee**: The types and invariants above will not change without a major bump and migration path.

## Rationale

- **Factory + StreamSource separation** allows hooks/runtime to decide *when* to kick off work, and to retry/replay by calling the factory again without the adapter holding stale state.
- **Explicit terminal chunks** remove the ambiguity of "did this stream end or is it stuck?" that haunts many agent libraries.
- **Chunk purity (A4)** is what makes speculative execution (#139) and streaming tool calls (#140) possible later without breaking A5.
- **Error-as-chunk (A9)** lets consumers handle provider errors and their own bugs uniformly in the stream consumer.
- **No mutation (A7)** is critical for replay (#134) and for fan-out scenarios (ensemble adapter, #146).

## Consequences

### Positive
- Writing a new adapter is a closed problem: satisfy 10 invariants, ship.
- Contract tests (`AdapterContractSuite`, forthcoming) can mechanically validate any adapter.
- Ensemble, router, fallback-chain adapters (#145, #146, #147) compose cleanly because every leaf adapter is interchangeable.
- Determinstic replay (#134) becomes straightforward: record chunk sequence, replay with a mock `AdapterFactory`.

### Negative
- Partial-args streaming for tool calls (some providers emit args token-by-token) is not supported in v1. Providers that need this must buffer internally until they have complete args before emitting the chunk.
- `metadata` being untyped means tooling/observability that depends on provider specifics (e.g., reasoning traces from Anthropic) is outside the contract — requires separate namespaced extensions.

## Alternatives considered

1. **Promise-based, non-streaming**. Rejected: streaming is table-stakes for agent UX.
2. **Observables instead of AsyncIterator**. Rejected: adds a dependency (or forces userland polyfill) and loses language-level `for await` ergonomics.
3. **Adapter as a class with methods** (`adapter.stream`, `adapter.abort`, `adapter.close`). Rejected: prevents purely-functional adapters; conflicts with single-iteration invariant.
4. **Single-method adapter returning `AsyncIterable`** (no abort). Rejected: loses cancellation, which is essential for UI (stop button, navigation away).
5. **Include cost/token counting in the contract**. Rejected for v1: providers report usage inconsistently; pushing into metadata keeps the contract small and lets observability evolve independently.

## Open questions (future work)

- **Partial-args tool calling**: some providers stream args token-by-token. A future RFC may extend A5 to allow an `args_delta` chunk type. Until then, adapters buffer internally.
- **Multi-modal inputs**: `Message` today is text-focused. A separate ADR (to be authored) formalizes image/audio/video in `AdapterRequest`.
- **Backpressure**: `AsyncIterableIterator` already supports backpressure via `for await`. We have not yet stress-tested whether consumers should be able to signal "slow down" beyond `abort`.
- **Streaming reasoning vs final text**: `type: 'reasoning'` is in the chunk union but semantics are loose. A future ADR should tighten what counts as reasoning vs text, especially for o1/o3 and similar models.

## References

- Current implementation: `packages/core/src/types/adapter.ts`
- Related contracts (to be ADR-ed next): Tool (#214), Memory, Retriever, Skill, Runtime
- Manifesto principle 3 (interop is radical, not optional) and principle 4 (zero lock-in)
