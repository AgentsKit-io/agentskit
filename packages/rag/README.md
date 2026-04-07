# @agentskit/rag

Plug-and-play retrieval-augmented generation: chunk documents, embed them, and retrieve the right context at query time.

## Why

- **Your data, your agent** — no fine-tuning required; ingest plain text and query with natural language
- **Composable stack** — uses any `EmbedFn` and any `VectorMemory` from [`@agentskit/adapters`](https://www.npmjs.com/package/@agentskit/adapters) and [`@agentskit/memory`](https://www.npmjs.com/package/@agentskit/memory)
- **Retriever-ready** — `createRAG()` returns a [`Retriever`](https://www.npmjs.com/package/@agentskit/core) you pass to [`@agentskit/runtime`](https://www.npmjs.com/package/@agentskit/runtime) or [`useChat`](https://www.npmjs.com/package/@agentskit/react) so context is injected automatically

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

## Next steps

- Tune chunking with `chunkSize`, `chunkOverlap`, or a custom `split` function on `createRAG`
- Swap `fileVectorMemory` for `redisVectorMemory` or a custom `VectorMemory` for production
- Use `geminiEmbedder`, `ollamaEmbedder`, or any `(text) => Promise<number[]>` as `embed`

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Retriever`, `VectorMemory`, types |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Vector backends (`fileVectorMemory`, etc.) |
| [@agentskit/adapters](https://www.npmjs.com/package/@agentskit/adapters) | `openaiEmbedder` and other embedders |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | `retriever` integration for agents |
| [@agentskit/react](https://www.npmjs.com/package/@agentskit/react) | `useChat` + chat UI with the same core types |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
