# @agentskit/example-rag-chat

**RAG over your docs** — a minimal, runnable chat that answers questions grounded
in a small markdown corpus. This is the reusable pattern: ingest documents, wire
the resulting retriever into `useChat`, and let the model answer only from what it
retrieved.

Stack: Vite + React + `@agentskit/react`, `@agentskit/rag`, `@agentskit/adapters`,
with on-device embeddings from `@huggingface/transformers`. No backend, no API key
for embeddings — only a (free) OpenRouter key for the chat model.

## Run it

```bash
pnpm install                              # from the repo root
pnpm --filter @agentskit/example-rag-chat dev
```

Open the printed URL, paste an OpenRouter key (https://openrouter.ai/keys), wait
for "Docs indexed and ready", then ask things like:

- "How much storage does the Free plan include?"
- "What's the maximum expiry for a signed URL?"
- "How do I delete a bucket?"

The first load downloads the embedding model (a few seconds); it is cached after.

## How it wires together

```
src/docs/*.md  ──▶  rag.ingest()  ──▶  in-memory vector store
                       (chunk + embed)
                                                │
user question ──▶ useChat({ retriever: rag }) ──┘
                       │  rag.retrieve() returns top-K chunks,
                       │  which AgentsKit injects into the system prompt
                       ▼
                openrouter() adapter  ──▶  grounded answer
```

- **`src/rag.ts`** builds three reused primitives: an `EmbedFn` (browser ONNX),
  an in-memory cosine `VectorMemory`, and `createRAG({ embed, store })`. `createRAG`
  returns an object that implements the `Retriever` contract.
- **`src/App.tsx`** ingests the sample docs on load, then passes the same `rag`
  object straight into `useChat({ adapter, retriever: rag })`. AgentsKit calls
  `rag.retrieve()` on each turn and injects the retrieved chunks as context.

## Make it yours

- **Swap the docs** — replace `src/docs/*.md` (and the imports in `src/rag.ts`)
  with your own content. Any string source works (fetched markdown, CMS, PDF text).
- **Swap the model** — change `DEFAULT_MODEL` in `src/App.tsx`, or swap
  `openrouter()` for any other `@agentskit/adapters` adapter (openai, anthropic, …).
- **Swap the store** — the in-memory cosine store in `src/rag.ts` is fine for a
  handful of docs. For a real corpus, replace it with a hosted vector store from
  `@agentskit/memory/vector` (pgvector, pinecone, qdrant, …). The `retriever`
  contract into `useChat` does not change.
