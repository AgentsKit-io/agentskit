---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0004-retriever-contract.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0004 - Contrato de retriever

> [!tldr] Em linguagem comum
> Retriever Contract.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Accepted; - **Date**: 2026-04-14.

## Decisão em linguagem comum

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

### Current implementation boundary

The RAG package owns `createRAG`, chunking, `RerankFn` composites, and bounded
document loaders because these capabilities produce or compose the retriever
contract without selecting a storage or embedding provider. `@agentskit/memory`
owns vector stores and `@agentskit/adapters` owns embedders. A future extraction
of loaders or rerankers requires a new ADR/RFC, an export-compatibility plan,
and evidence that the split improves the package's size or release boundary.

## Contexto

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

The contract lives in `packages/core/src/types/retrieval.ts`. `@agentskit/rag`
currently provides the reference implementation plus chunking, hybrid/reranking
composition, and thin document-loader adapters. Vector stores remain owned by
`@agentskit/memory`, and embedders remain injectable. This keeps the public
composition seam independent of provider choice.

## Consequências

### Positive
- Any retriever (RAG, BM25, web search, hybrid) is interchangeable in the runtime, hooks, and skills.
- Composite retrievers (reranking and hybrid) fall out as natural patterns: implement `Retriever`, internally hold N child retrievers, merge in `retrieve`.
- Web search tools (#172) get a clean home: the tool's `execute` calls a `Retriever` internally and shapes the result.
- Reasoning about retrieval is local — you read one method.
- Memory recall (long-term context) becomes a `Retriever` over chat memory, not a separate concept.

### Negative
- **No per-call topK/threshold.** Consumers wanting different limits per turn must hold multiple retriever instances. Acceptable for v1; trivial to add to v2 if real friction emerges.
- **Indexing is outside the contract.** `Retriever` knows nothing about how documents got into the index. This is correct for substitutability but means there is no universal "ingest" interface — RAG has it, web search doesn't.
- **Score normalization is implementation-burden** for composite retrievers (R11). If you wrap a vector retriever (cosine 0-1) and a BM25 retriever (raw 0-50), you have to renormalize. This is a known cost.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0004-retriever-contract.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0004-retriever-contract.md:1`
