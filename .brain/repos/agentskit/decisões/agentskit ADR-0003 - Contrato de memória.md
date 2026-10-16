---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0003-memory-contract.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0003 - Contrato de memória

> [!tldr] Em linguagem comum
> Contrato de memória: o que um backend de memória de chat ou vetorial precisa cumprir. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-04-14.

## Decisão em linguagem comum

Two independent contracts — `ChatMemory` and `VectorMemory` — plus a standalone `EmbedFn` primitive.

### Core types

```ts
export interface ChatMemory {
  load: () => MaybePromise<Message[]>
  save: (messages: Message[]) => MaybePromise<void>
  clear?: () => MaybePromise<void>
}

export interface VectorDocument {
  id: string
  content: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

export interface VectorMemory {
  store: (docs: VectorDocument[]) => MaybePromise<void>
  search: (
    embedding: number[],
    options?: { topK?: number; threshold?: number },
  ) => MaybePromise<RetrievedDocument[]>
  delete?: (ids: string[]) => MaybePromise<void>
}

export type EmbedFn = (text: string) => Promise<number[]>
```

### Invariants — ChatMemory

**CM1. Load is a snapshot.** `load()` returns the full message history as of the call time. It MUST NOT stream or paginate in v1. Implementations needing pagination expose it as a separate, non-contract method.

**CM2. Save is replace-all semantics.** `save(messages)` MUST persist the given array as the authoritative history — it is not an append. This matches how controllers actually use it (append locally, flush the whole state) and removes ambiguity between "append" and "replace".

**CM3. Ordering preserved.** `load()` returns messages in the same order that `save()` received them. Implementations MUST NOT reorder, deduplicate, or mutate.

**CM4. Save is atomic from the consumer's perspective.** A partial save that leaves memory in an inconsistent state is a contract violation. A crashed save either succeeded fully or is indistinguishable from "never happened" at the next `load()`.

**CM5. Load on empty returns `[]`.** A fresh memory with nothing ever saved MUST return an empty array, not throw or return null.

**CM6. Clear is opt-in.** Implementations MAY omit `clear`. Consumers MUST handle its absence — typically by overwriting with `save([])`.

### Invariants — VectorMemory

**VM1. Store is upsert by id.** Calling `store` with a `VectorDocument` whose `id` already exists MUST replace the prior document. No duplicate-id errors.

**VM2. Embedding dimensionality is a constructor concern.** The contract does NOT include a `dimensions` field. Implementations are free to accept any dimensionality at construction time and reject mismatches on store/search. Mixing dimensionalities within one backend is a contract violation of the implementation's own configuration.

**VM3. Search returns scored documents sorted descending.** Results from `search` MUST be ordered by similarity score descending. The scoring metric (cosine, dot product, L2) is implementation-defined but MUST be consistent within one backend.

**VM4. topK is an upper bound, not a floor.** If fewer than `topK` documents pass the optional `threshold`, the returned array is shorter. Implementations MUST NOT pad with placeholders.

**VM5. threshold is exclusive from below.** A `threshold: 0.7` returns documents with score `> 0.7`, not `>= 0.7`. This is a tiebreaker for reproducibility; the invariant matters more than the direction.

**VM6. Metadata is opaque.** `metadata` on `VectorDocument` is `Record<string, unknown>`. The contract does not specify filtering. Backend-specific metadata filtering (e.g., Pinecone namespaces, Qdrant payload filters) lives outside the contract as extension methods.

**VM7. Delete is opt-in.** Like `ChatMemory.clear`, `delete` MAY be omitted. Long-term memory stores (audit logs, compliance) may legitimately refuse deletion.

**VM8. Store and search are serialization-safe.** `VectorDocument` (minus the embedding, which is a number[]) MUST be JSON-serializable. This enables replay, export, and cross-backend migration.

### Invariants — EmbedFn

**E1. Stable output per input + model.** For a given embedding model, `embed(text)` MUST return the same vector for the same input across calls. Randomness in embedding generation is a contract violation.

**E2. No side effects.** `embed` MUST NOT mutate external state. Caching is allowed; other side effects are not.

**E3. Error-as-rejection.** Failure is signaled by rejecting the promise. There is no "null embedding" return value.

### Composition

A `VectorMemory` + `EmbedFn` pair is enough to build RAG. The RAG package (`@agentskit/rag`) composes them explicitly rather than hiding the coupling — consumers see exactly which embedder feeds which store.

### Versioning and stability

- **Tier**: `stable`
- **Version**: v1 of each contract, semver'd independently of packages
- Breaking changes follow the same rules as ADR 0001/0002

## Contexto

**Memory** is how AgentsKit persists conversation state and retrieves relevant context across turns, sessions, or processes. Two distinct concerns live under this name:

1. **Chat memory** — the ordered history of messages for a session. Mostly append + load.
2. **Vector memory** — embeddings indexed for semantic retrieval. The backbone of RAG (#175) and long-term context.

Treating them as a single interface has been tried elsewhere (LangChain's `Memory` abstraction) and produced leaky, confusing APIs. We split them. A future ADR may introduce a **memory graph** (#180) as a third concern; it does not replace either of these.

Today the contracts live in `packages/core/src/types/memory.ts` and are implemented in `packages/memory/src/*` (file, SQLite, Redis). Fase 3 will add ≥8 more backends (Postgres+pgvector, Pinecone, Qdrant, Chroma, Weaviate, Turso, Cloudflare Vectorize, Upstash, #178). Before we 4x the implementations, we formalize the contract.

## Consequências

### Positive
- New memory backend = satisfy 6 invariants for ChatMemory OR 8 for VectorMemory, not both.
- The RAG package (#175) gets a stable substrate: any `VectorMemory` + any `EmbedFn` = RAG.
- Memory graph (#180) can be introduced as a third contract without breaking either of these.
- Deterministic replay (#134) can snapshot chat memory trivially; vector memory is harder and is addressed as a separate concern.
- Cross-backend migration (export from Redis, import to Postgres) is a matter of `load → save` for chat, `search with large topK → store` for vectors.

### Negative
- **No native streaming of chat history** — pagination must be built above the contract. Acceptable given chat sessions rarely exceed thousands of messages and the few that do need custom solutions anyway.
- **Metadata filtering isn't standardized**. Real use cases (filter by user_id, namespace, date range) need either an escape hatch or a v2 ADR. We accept this for v1; see Open Questions.
- **Embedding model lock-in on VectorMemory**. A store filled with 1536-dim OpenAI embeddings cannot be searched with 1024-dim Cohere embeddings. The contract doesn't prevent this — it's a userland responsibility. Good adapters include the embedding model name in `metadata` for forensics.

## Pacotes afetados

- [[agentskit-core]] — tipos `ChatMemory` e `VectorMemory`.
- [[agentskit-adapters]] (embedders), [[agentskit-memory]], [[agentskit-rag]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0003-memory-contract.md:1`
