---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0001-adapter-contract.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0001 - Contrato de adapter

> [!tldr] Em linguagem comum
> Define o que um adaptador de modelo precisa cumprir: quatro tipos, invariantes A1–A10 e regras de versão.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-04-14.

## Decisão em linguagem comum

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

## Contexto

An **Adapter** is how AgentsKit talks to a language-model provider. It is the seam between application code (controllers, hooks, runtime loops) and an external service (OpenAI, Anthropic, Ollama, a local model, a mock for tests).

As the Fase 3 roadmap will add 10+ adapters (Mistral, Cohere, Together, Groq, Fireworks, Replicate, OpenRouter, Bedrock, Azure OpenAI, Vertex AI, xAI/Grok, HuggingFace, local models), we need a **formal, versioned contract** that:

- Makes "plug-and-play" verifiable, not aspirational
- Lets contributors add a new adapter without reading all of core
- Survives breaking changes via a deprecation cycle
- Can be validated at runtime by a future `ContractValidator` (see #214 follow-ups)

Today the contract is implicit in `packages/core/src/types/adapter.ts`. This ADR promotes it to a first-class artifact.

## Consequências

### Positive
- Writing a new adapter is a closed problem: satisfy 10 invariants, ship.
- Contract tests (`AdapterContractSuite`, forthcoming) can mechanically validate any adapter.
- Ensemble, router, fallback-chain adapters (#145, #146, #147) compose cleanly because every leaf adapter is interchangeable.
- Determinstic replay (#134) becomes straightforward: record chunk sequence, replay with a mock `AdapterFactory`.

### Negative
- Partial-args streaming for tool calls (some providers emit args token-by-token) is not supported in v1. Providers that need this must buffer internally until they have complete args before emitting the chunk.
- `metadata` being untyped means tooling/observability that depends on provider specifics (e.g., reasoning traces from Anthropic) is outside the contract — requires separate namespaced extensions.

## Pacotes afetados

- [[agentskit-core]] — define os tipos `AdapterFactory`, `AdapterRequest` e `StreamChunk`.
- [[agentskit-adapters]] — implementa os provedores.
- [[agentskit-runtime]] — consome o adaptador no laço.

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- **Substitui**: —

## Fonte

`docs/architecture/adrs/0001-adapter-contract.md:1`
