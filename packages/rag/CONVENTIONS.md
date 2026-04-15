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
