# ADR 0004 — Retriever Contract

- **Status**: Accepted
- **Date**: 2026-04-14
- **Supersedes**: —
- **Related issues**: #214
- **Related ADRs**: [0001 — Adapter](./0001-adapter-contract.md), [0002 — Tool](./0002-tool-contract.md), [0003 — Memory](./0003-memory-contract.md)

## Context

A **Retriever** is the layer that, given a user query and conversation context, returns relevant documents the model should consider before answering. It is the inversion-of-control seam between "agent talking" and "agent reading."

Retrievers are not just RAG. The same interface serves:
- Vector RAG over an indexed knowledge base (the common case)
- BM25 keyword search
- Hybrid search (BM25 + vector + reranking)
- Web search via an external API
- Code search across a repo
- Memory recall (long-term conversational context)
- Composite retrievers that fan out and merge

If every variant has its own type, RAG/agents/UI all have to know which they're talking to. We collapse them under a single contract and let composition handle the variety.

Today the contract lives in `packages/core/src/types/retrieval.ts` and the only implementation is `@agentskit/rag`. Fase 2 (#155 hybrid search, #154 RAG reranking) and Fase 3 (#178 vector backends, web search tools) will multiply implementations. Time to formalize.

## Decision

A single, narrow contract: one method, one input shape, one output shape.

### Core types

```ts
export interface RetrievedDocument {
  id: string
  content: string
  source?: string
  score?: number
  metadata?: Record<string, unknown>
}

export interface RetrieverRequest {
  query: string
  messages: Message[]
}

export interface Retriever {
  retrieve: (request: RetrieverRequest) => MaybePromise<RetrievedDocument[]>
}
```

### Invariants

**R1. Retrieve is read-only.** `retrieve` MUST NOT mutate the index it queries, the input request, or any global state. A retriever is an observation, not a transaction.

**R2. Query is the question, messages are context.** `query` is the focused string the retriever ranks against. `messages` is the surrounding conversation, available for retrievers that need it (query rewriting, conversational compression). Retrievers that only need `query` MUST ignore `messages`.

**R3. Empty results are a valid answer.** `retrieve` returning `[]` is success — no relevant documents were found. It is NOT an error.

**R4. Errors throw, no sentinel values.** Unlike Adapter (where errors are chunks) and Tool (where errors are status), a retriever fails by rejecting the promise. There is no `RetrieverError` type and no error documents in the result. This matches how every retrieval backend already behaves and avoids polluting the result type.

**R5. id is stable.** A `RetrievedDocument`'s `id` MUST be stable across calls — the same logical document returns the same id. Two retrievers querying different backends MAY produce different ids for the same content (this is acceptable; deduplication, when desired, is a composer concern).

**R6. Score is optional but ordered.** When `score` is present on any returned document, it MUST be present on all and the array MUST be sorted by score descending. When `score` is absent, no ordering guarantee is given — consumers MUST treat the array as a set.

**R7. Score scale is implementation-defined but consistent.** A given retriever instance MUST use the same scale (e.g., cosine similarity in `[0, 1]`, BM25 raw score, normalized rank) across all calls. Mixing scales within one retriever is a contract violation.

**R8. Source is informational.** `source` (e.g., URL, file path) helps consumers cite. The contract does not require it; retrievers SHOULD provide it when meaningful.

**R9. Metadata is opaque.** `metadata` mirrors VectorMemory's metadata semantics (ADR 0003 VM6): backend-specific data, JSON-serializable, consumers must not depend on shape.

**R10. No implicit limits.** The contract does not specify a maximum number of returned documents. Retrievers MAY apply a sensible default (e.g., 10) but MUST document it. Consumers wanting control configure the retriever at construction time, not per-call (see Open Questions on per-call options).

**R11. Composition is transparent.** A composite retriever that wraps N other retrievers MUST itself satisfy this contract — including R6/R7 ordering, even if it has to renormalize scores from heterogeneous sources.

### Versioning and stability

- **Tier**: `stable`
- **Version**: v1, semver'd independently of packages
- Breaking changes follow ADR 0001's policy

## Rationale

- **Single method (`retrieve`)** keeps the contract testable and the surface area minimal. Indexing, invalidation, and lifecycle are NOT in the contract — they belong to the implementation (e.g., `RAG.ingest` is on the RAG type, not the Retriever type).
- **Context as messages array (R2)** is what makes conversational retrievers possible without a new contract. Most retrievers ignore it; a query-rewriting retriever can use it; the contract doesn't force either.
- **Errors throw (R4)** is intentional asymmetry vs Adapter/Tool. Retrievers are typically called once per turn, synchronously from the runtime's perspective. Wrapping every retrieve in error chunks would add ceremony for no gain.
- **Optional score (R6)** is what makes web search and BM25 fit. They sometimes return ranked results, sometimes don't (web search APIs vary). The contract accepts both rather than forcing fake scores.
- **No per-call options (R10)** keeps `retrieve` callable by composers that don't know which retriever they're holding. Configuration belongs at construction. This is a deliberate trade against flexibility for substitutability.

## Consequences

### Positive
- Any retriever (RAG, BM25, web search, hybrid) is interchangeable in the runtime, hooks, and skills.
- Composite retrievers (#154 reranking, #155 hybrid) fall out as natural patterns: implement `Retriever`, internally hold N child retrievers, merge in `retrieve`.
- Web search tools (#172) get a clean home: the tool's `execute` calls a `Retriever` internally and shapes the result.
- Reasoning about retrieval is local — you read one method.
- Memory recall (long-term context) becomes a `Retriever` over chat memory, not a separate concept.

### Negative
- **No per-call topK/threshold.** Consumers wanting different limits per turn must hold multiple retriever instances. Acceptable for v1; trivial to add to v2 if real friction emerges.
- **Indexing is outside the contract.** `Retriever` knows nothing about how documents got into the index. This is correct for substitutability but means there is no universal "ingest" interface — RAG has it, web search doesn't.
- **Score normalization is implementation-burden** for composite retrievers (R11). If you wrap a vector retriever (cosine 0-1) and a BM25 retriever (raw 0-50), you have to renormalize. This is a known cost.

## Alternatives considered

1. **Generic `Retriever<TQuery, TDoc>`**. Rejected: queries are strings in 99% of cases. Generics propagate type noise through every consumer for a small win.
2. **Streaming retrieval** (`AsyncIterable<RetrievedDocument>`). Considered. Most use cases want the full ranked list before reasoning. Streaming complicates ordering (R6). Deferred to a future ADR if a real progressive-retrieval use case emerges.
3. **Score required**. Rejected: web search APIs and some plain document stores don't give one. Forcing fake scores is worse than admitting they're absent.
4. **Per-call options object** (`retrieve(request, options?)`). Rejected for v1: see R10. The escape hatch is to construct a configured retriever and pass it in.
5. **Errors as a separate result variant** (`Result<RetrievedDocument[], RetrieverError>`). Rejected: adds a dependency or hand-rolled type, doesn't match how JS code reads retrieval naturally.
6. **Separate `KeywordRetriever` and `VectorRetriever` interfaces**. Rejected: kills substitutability. The whole point of the contract is that the runtime doesn't care which.

## Open questions (future work)

- **Per-call options**: if reranking, hybrid, or composite cases create real pressure for per-call topK/threshold, a v2 ADR will add an `options` parameter.
- **Streaming retrieval**: open. No current use case justifies it.
- **Filter / metadata query language**: same status as ADR 0003 (Memory). Backend-specific filters live outside the contract; a cross-backend spec is hard.
- **Indexing contract**: should there be an `Indexer` companion contract? Currently each retriever owns its own indexing API (RAG.ingest, web search has none). Postponed until a second indexable retriever ships.
- **Citation**: `source` is informational. A future ADR may formalize structured citations (page numbers, character ranges) for legal/research domains.
- **Caching**: per-instance caching is fine; cross-instance shared caches would need contract attention.
- **Reranking as a first-class concept**: a `Reranker` type taking `(query, documents) → documents` may emerge. Today reranking is a composite Retriever.

## References

- Current implementation: `packages/core/src/types/retrieval.ts`, `packages/rag/src/*`
- Related contracts: ADR 0001 (Adapter), ADR 0002 (Tool), ADR 0003 (Memory) — `VectorMemory` is a substrate, `Retriever` is the consumer-facing interface
- Manifesto principles 2 (plug-and-play), 3 (interop is radical), 8 (small, deep, testable modules)
