# @agentskit/rag

Plug-and-play retrieval-augmented generation: chunk documents, embed them, and retrieve the right context at query time.

[![npm version](https://img.shields.io/npm/v/@agentskit/rag?color=blue)](https://www.npmjs.com/package/@agentskit/rag)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/rag)](https://www.npmjs.com/package/@agentskit/rag)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/rag)](https://bundlephobia.com/package/@agentskit/rag)
[![license](https://img.shields.io/npm/l/@agentskit/rag)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `rag` · `retrieval` · `vector-search` · `embeddings` · `ai-agents` · `semantic-search` · `knowledge-base`

## Why rag

- **Your data, your agent** — no fine-tuning required; ingest plain text and query with natural language
- **Composable stack** — uses any `EmbedFn` and any `VectorMemory` from `@agentskit/adapters` and `@agentskit/memory`; swap either layer without touching RAG logic
- **Retriever-ready** — `createRAG()` returns a `Retriever` you pass to `@agentskit/runtime` or `useChat` so context is injected automatically
- **Tune chunking without a PhD** — `chunkSize`, `chunkOverlap`, or a custom `split` function — three knobs that cover 95% of use cases

## Install

```bash
npm install @agentskit/rag @agentskit/memory @agentskit/adapters
```

## Quick example

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

- `createRAG({ embed, store })` — single entry point for ingest + retrieve
- `rag.ingest(docs)` — chunk, embed, and store documents
- `rag.search(query, { topK })` — semantic similarity search
- `rag.retrieve({ query, messages })` — `Retriever` contract v1 for runtime/controller injection
- Configurable chunking: `chunkSize`, `chunkOverlap`, custom `split`
- Works with any `EmbedFn` and any `VectorMemory`

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
