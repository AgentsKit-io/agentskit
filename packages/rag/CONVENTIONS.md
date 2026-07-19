# Conventions — `@agentskit/rag`

Plug-and-play RAG. One factory (`createRAG`) returning a `RAG` that satisfies the `Retriever` contract from [ADR 0004](../../docs/architecture/adrs/0004-retriever-contract.md).

## Scope

- `createRAG({ store, embed, chunkSize, topK, threshold })`
- Simple chunker (`chunker.ts`) — paragraph-based splits with configurable size
- Types linking `RAG` to `Retriever`

## What does NOT belong here

- Vector store implementations → `@agentskit/memory`
- Embedders → `@agentskit/adapters`
- Document loaders (URL, PDF, Notion, etc.) → a future `@agentskit/loaders` package

## Adding a capability

Before adding:

1. Can this be done by **composition**? Wrapping `createRAG`'s output in another `Retriever` is almost always the answer.
2. Is this actually about chunking? Put it next to the existing chunker and add a `split` option to `createRAG` if it's reusable.
3. Is this re-ranking? That's a composite `Retriever` — probably belongs in a separate package, not here.

The core `createRAG` is intentionally small. Keep it that way.

## Chunking

- The default chunker splits on paragraphs, respecting `chunkSize`.
- Custom chunkers implement `(text: string) => string[]`.
- Do not make chunking async — if loading is async, load first then chunk synchronously.
- Invalid `chunkSize` (≤ 0 or non-finite) is treated as “no split” (single chunk). Invalid
  `chunkOverlap` (negative / non-finite) is treated as 0; overlap is always clamped below
  `chunkSize` so the loop cannot stall.

## Resilience (loaders + composites)

- Loader HTTP/network and response-body read/parse failures throw `RagError` with
  `AK_RAG_LOAD_FAILED`. Abort (including after fetch resolves, e.g. body read) is never
  treated as a per-object skip — it terminates the whole load with `AK_RAG_LOAD_FAILED`.
- Tree/list loaders (`loadGitHubTree`, `loadS3`, `loadGcs`, `loadDropbox`, `loadOneDrive`):
  individual non-abort download/body failures may be skipped for partial success, but if one
  or more eligible downloads were attempted and **all** failed, throw `AK_RAG_LOAD_FAILED`.
  Empty list / fully filtered input still returns `[]`. Missing/invalid S3
  `Body.transformToString` is a failed eligible download (not an empty success).
- Pagination that reports more data without a **new** cursor/token/`@odata.nextLink` throws
  `AK_RAG_LOAD_FAILED` (incomplete pagination — no silent truncation).
- `loadNotionPage` paginates Notion block children via `has_more` / `next_cursor`, passing
  `start_cursor` on subsequent pages, preserving block order across pages, forwarding
  `signal`, and throwing `AK_RAG_LOAD_FAILED` when `has_more` is true without a new (or with a
  repeated) cursor. Supported block flattening (paragraph + heading_1/2/3) is unchanged.
- OneDrive walks each folder with `@odata.nextLink` pagination, detects repeated next links,
  and keeps `maxFiles` / recursion / abort / partial-vs-all-failed semantics.
- `maxFiles` that is ≤ 0 or non-finite resolves to an empty result (no unbounded load).
- `createRerankedRetriever` / `createHybridRetriever` clamp `topK` / `candidatePool` to ≥ 1
  and copy candidates before reranking.
- **Scores (R6):** if no scores are present, preserve order. If any score is present, every
  result must have a finite numeric score and is sorted descending. Mixed / non-finite scores
  throw — never fabricate `Number.NEGATIVE_INFINITY`. Reranker/composite failures use
  `AK_RAG_RERANK_FAILED`; `createRAG` may throw `TypeError`.
- Voyage/Jina/custom reranker outputs are validated (array shape, document fields, indices,
  finite scores). Malformed output throws `AK_RAG_RERANK_FAILED` — no silent filtering into
  partial/empty success. Fully scoreless custom output keeps its order.
- `VoyageRerankerOptions` / `JinaRerankerOptions` accept optional `signal?: AbortSignal`,
  forwarded to `fetch`. Request and response-body aborts surface as `AK_RAG_RERANK_FAILED`
  (not a different code). This is additive and does not change package exports.
- Hybrid blending uses min-max normalization of finite scores into `[0, 1]` before applying
  relative `vectorWeight` / `bm25Weight` (non-negative finite weights normalized to sum to 1;
  both zero → 0.5/0.5; output scores remain finite).
- `bm25Score` accepts `k1 ≥ 0` and `b ∈ [0, 1]`; invalid finite/non-finite values fall back to
  defaults (1.5 / 0.75). Every emitted BM25 score is finite.

## Testing

- The RAG factory must satisfy the Retriever contract (R1–R11).
- Test ingest + retrieve as an end-to-end: `ingest([docs]) → retrieve({ query })` returns relevant documents in descending score order.
- Test empty ingest → empty retrieve (returns `[]`, not an error).

## Common pitfalls

| Pitfall | What to do instead |
|---|---|
| Letting `RAG` depend on a specific vector store | Inject via `store` option; `RAG` is store-agnostic |
| Splitting by exact character count mid-word | Prefer paragraph boundaries with size as a soft cap |
| Returning unordered results | Sort descending by score (R6) |
| Padding to `topK` when fewer match | `topK` is an upper bound |

## Review checklist for this package

- [ ] Bundle size under 10KB gzipped
- [ ] Coverage threshold holds (95% lines)
- [ ] `RAG` still extends `Retriever`
- [ ] New features added by composition where possible
- [ ] Chunker changes are backward-compatible (existing indexed docs still retrieve)
