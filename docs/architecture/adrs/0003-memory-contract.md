# ADR 0003 — Memory Contract

- **Status**: Accepted
- **Date**: 2026-04-14
- **Supersedes**: —
- **Related issues**: #214
- **Related ADRs**: [0001 — Adapter](./0001-adapter-contract.md), [0002 — Tool](./0002-tool-contract.md)

## Context

**Memory** is how AgentsKit persists conversation state and retrieves relevant context across turns, sessions, or processes. Two distinct concerns live under this name:

1. **Chat memory** — the ordered history of messages for a session. Mostly append + load.
2. **Vector memory** — embeddings indexed for semantic retrieval. The backbone of RAG (#175) and long-term context.

Treating them as a single interface has been tried elsewhere (LangChain's `Memory` abstraction) and produced leaky, confusing APIs. We split them. A future ADR may introduce a **memory graph** (#180) as a third concern; it does not replace either of these.

Today the contracts live in `packages/core/src/types/memory.ts` and are implemented in `packages/memory/src/*` (file, SQLite, Redis). Fase 3 will add ≥8 more backends (Postgres+pgvector, Pinecone, Qdrant, Chroma, Weaviate, Turso, Cloudflare Vectorize, Upstash, #178). Before we 4x the implementations, we formalize the contract.

## Decision

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

## Rationale

- **Splitting ChatMemory and VectorMemory** matches real backends: Redis is a fine chat store but a mediocre vector store; pgvector is the opposite. A unified interface forces every backend to implement both badly or throw half the methods.
- **Replace-all save (CM2)** is the least surprising semantic. Append-only with deduplication leaks complexity into every consumer; replace-all means "flush current state," which is what controllers do anyway.
- **Upsert by id (VM1)** prevents the "did I store this already?" branching in every RAG indexer. It also lets re-indexing a document update the store cheaply.
- **No dimensionality in the contract (VM2)** is deliberate: forcing it would make the contract asymmetric (what's the "right" default? 1536? 3072?), while rejecting mismatches at the implementation level is trivial.
- **Descending score ordering (VM3)** is what every consumer expects. Consistent scoring metric within a backend is what makes `threshold` meaningful.
- **EmbedFn as a separate type (E1-E3)** means adapters can ship their own embedder implementations (OpenAI `text-embedding-3-large`, Cohere, local models) without touching the vector contract.

## Consequences

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

## Alternatives considered

1. **Unified Memory interface** (LangChain-style, chat + vector in one). Rejected: produces implementations that half-fulfill both sides.
2. **Event-sourced chat memory** (`append`, never rewrite). Rejected: forces every backend to implement ordering, sequencing, and compaction. `save` with replace semantics is 10x simpler.
3. **Typed metadata via generics** (`VectorDocument<TMeta>`). Considered for follow-up; the generic has to propagate through every layer and the payoff is small when metadata is already TypeScript-opaque.
4. **Distance instead of similarity** (lower is better). Rejected: "higher is more similar" is the common intuition and matches how every major vector DB reports scores via their SDKs.
5. **Embedding as part of VectorMemory.store input** (store takes text, embeds internally). Rejected: entangles memory with provider choice, prevents pre-computed embeddings, makes testing harder. Explicit `EmbedFn` is cleaner.
6. **`get(id)` on VectorMemory**. Deferred: not essential for v1. Can be added to a specific backend as an extension method.

## Open questions (future work)

- **Metadata filtering**: should `search` accept a `filter` parameter (MongoDB-style query, Jsonata, simple key-equals)? Every real backend has one; a cross-backend spec is tricky. Likely a v2 ADR.
- **Hybrid search** (BM25 + vector, #155): will require either a new method or a new interface. Being tracked.
- **Memory graph** (#180): a third memory contract for non-linear relationships. Does not replace these; supplements them.
- **TTL / eviction**: retention policies are real concerns for GDPR/LGPD compliance. Currently outside the contract; backends implement where relevant.
- **Transactions across ChatMemory + VectorMemory**: when a chat message references a stored document, atomic consistency matters. No current plan to address.
- **Client-side encryption** (#179): not a contract change — the key-holder wraps both memories with an encrypting proxy.

## References

- Current implementation: `packages/core/src/types/memory.ts`, `packages/core/src/memory.ts`
- Backends: `packages/memory/src/*` (file-vector, sqlite, redis-chat, redis-vector)
- Related contracts: ADR 0001 (Adapter), ADR 0002 (Tool), upcoming ADR 0004 (Retriever) — uses VectorMemory
- Manifesto principles 2 (plug-and-play), 4 (zero lock-in)
