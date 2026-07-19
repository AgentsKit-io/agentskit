# @agentskit/rag

Profile: <code>major-package</code>

<p align="center"><img alt="AgentsKit" src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" width="180" /></p>

Plug-and-play retrieval-augmented generation: chunk documents, embed them, and retrieve the right context at query time.

[![npm version](https://img.shields.io/npm/v/@agentskit/rag?color=blue)](https://www.npmjs.com/package/@agentskit/rag)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/rag)](https://www.npmjs.com/package/@agentskit/rag)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/rag?label=bundle)](https://bundlejs.com/?q=@agentskit/rag)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `rag` · `retrieval` · `vector-search` · `embeddings` · `ai-agents` · `semantic-search` · `knowledge-base`

## Verified proof

- Package metadata and tests live under `packages/rag/`.
- Package guide: https://www.agentskit.io/docs/packages/rag
- Stability map: [docs/STABILITY.md](../../docs/STABILITY.md)

## How this fits the ecosystem

@agentskit/rag is the retrieval layer: load documents, chunk them, embed them, rerank results, and feed precise context back to agents.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/rag) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why rag

- **Your data, your agent** — no fine-tuning required; ingest plain text and query with natural language
- **Composable stack** — uses any `EmbedFn` and any `VectorMemory` from `@agentskit/adapters` and `@agentskit/memory`; swap either layer without touching RAG logic
- **Retriever-ready** — `createRAG()` returns a `Retriever` you pass to `@agentskit/runtime` or `useChat` so context is injected automatically
- **Tune chunking without a PhD** — `chunkSize`, `chunkOverlap`, or a custom `split` function — three knobs that cover 95% of use cases

## Install

<!-- readme-command:install -->
```bash
npm install @agentskit/rag @agentskit/memory @agentskit/adapters
```

## Quick example

<!-- readme-example:quickstart -->
```ts
import { createRAG } from '@agentskit/rag'
import { openaiEmbedder } from '@agentskit/adapters'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
  store: fileVectorMemory({ path: './vectors' }),
})

await rag.ingest([
  { id: 'doc-1', content: 'AgentsKit is a JavaScript agent toolkit...' },
])

const docs = await rag.search('How does AgentsKit work?', { topK: 5 })
console.log(docs)
```

## With runtime (retriever)

Pass the RAG instance as `retriever` so the runtime injects retrieved context into the task:

```ts
import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  retriever: rag,
})

const result = await runtime.run('Explain the AgentsKit architecture based on ingested docs')
console.log(result.content)
```

You can also call `rag.retrieve({ query, messages })` to satisfy the core `Retriever` contract (for example from a custom controller).

## Features

- `createRAG({ embed, store })` — single entry point for ingest + retrieve.
- `rag.ingest(docs)` — chunk, embed, and store documents.
- `rag.search(query, { topK })` — semantic similarity search.
- `rag.retrieve({ query, messages })` — `Retriever` contract v1 for runtime/controller injection.
- Configurable chunking: `chunkSize`, `chunkOverlap`, custom `split`.
- Works with any `EmbedFn` and any `VectorMemory`.
- **Rerankers:** `createRerankedRetriever` (Cohere Rerank, BGE, BM25 default), `createHybridRetriever` (vector + BM25 blend), standalone `bm25Score`. [Recipe](https://www.agentskit.io/docs/recipes/rag-reranking).
- **Document loaders:** `loadUrl`, `loadGitHubFile`, `loadGitHubTree`, `loadNotionPage`, `loadConfluencePage`, `loadGoogleDriveFile`, `loadPdf` (BYO parser). [Recipe](https://www.agentskit.io/docs/recipes/doc-loaders).
- **Loader resilience:** HTTP/network and response-body read/parse failures surface as `RagError` (`AK_RAG_LOAD_FAILED`). Optional `signal` aborts (including mid-body reads) are never swallowed as a per-object skip. Tree/list loaders may return partial success when at least one eligible download succeeded; if every attempted eligible download failed, they throw. Missing/invalid S3 object bodies count as failed downloads. Pagination that reports more data without a new cursor/token throws (no silent truncation). `loadNotionPage` follows Notion `has_more` / `next_cursor` with `start_cursor` until complete (preserving block order; incomplete or repeated cursors throw). Non-positive / non-finite `maxFiles` yields `[]`.
- **Score contracts:** scoreless search/rerank results keep order. When any score is present, every result must have a finite numeric score and is sorted descending — mixed or non-finite scores throw (never fabricate `-Infinity`). Malformed Voyage/Jina/custom reranker output throws `AK_RAG_RERANK_FAILED`. Optional `signal` on `voyageReranker` / `jinaReranker` is forwarded to `fetch`; request/body aborts remain `AK_RAG_RERANK_FAILED`. `bm25Score` sanitizes invalid `k1`/`b` to documented defaults and always emits finite scores. Hybrid relative weights are normalized to a finite pair that sums to 1 (both zero → 0.5/0.5).
- **Chunk/config safety:** invalid `chunkSize` / `chunkOverlap` / `topK` values are sanitized so chunking always terminates and search never sends non-finite limits to the store.

### S3 in Expo and React Native runtimes

Node consumers may install `@aws-sdk/client-s3` and let `loadS3` resolve it lazily. Browser, Expo/Metro, and React Native bundles keep that peer out of the universal entry; pass the command constructors explicitly when invoking the loader:

```ts
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { loadS3 } from '@agentskit/rag'

await loadS3({
  client: new S3Client({}),
  bucket: 'knowledge',
  commands: { GetObjectCommand, ListObjectsV2Command },
})
```

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Retriever`, `VectorMemory`, types |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Vector backends (`fileVectorMemory`, etc.) |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | `openaiEmbedder` and other embedders |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `retriever` integration for agents |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | `useChat` + chat UI with the same core types |

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)

## Maturity and compatibility

- Stability: **beta** — see [docs/STABILITY.md](../../docs/STABILITY.md)
- **Node.js 20+** and **TypeScript** strict mode
- Published as `@agentskit/rag`

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and the monorepo [LICENSE](../../LICENSE).
