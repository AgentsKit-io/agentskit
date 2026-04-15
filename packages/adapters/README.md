# @agentskit/adapters

![stability: stable](https://img.shields.io/badge/stability-stable-brightgreen)

Connect to any LLM provider — and swap between them — without touching your app code.

## Why

- **Vendor independence** — switch from OpenAI to Anthropic to a local Ollama model by changing one line; your hooks, runtime, and tools stay untouched
- **10+ providers included** — Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, LangChain, Vercel AI SDK, and any raw `ReadableStream`
- **Embedder functions built in** — the same adapter pattern covers text embeddings, so you can reuse provider config for both chat and RAG

## Install

```bash
npm install @agentskit/adapters
```

## Quick example

```ts
import { anthropic, openai, ollama } from '@agentskit/adapters'
import { createRuntime } from '@agentskit/runtime'

// Switch provider by swapping one import
const adapter = anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' })
// const adapter = openai({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o' })
// const adapter = ollama({ model: 'llama3.1' })

const runtime = createRuntime({ adapter })
const result = await runtime.run('Summarize the latest AI news')
console.log(result.content)
```

## Embeddings (for RAG)

Use the same package for vector embeddings — wire `openaiEmbedder`, `geminiEmbedder`, or `ollamaEmbedder` into [`@agentskit/rag`](https://www.npmjs.com/package/@agentskit/rag):

```ts
import { openaiEmbedder } from '@agentskit/adapters'
import { createRAG } from '@agentskit/rag'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
  store: fileVectorMemory({ path: './vectors' }),
})
```

## Next steps

- Pair adapters with [`@agentskit/runtime`](https://www.npmjs.com/package/@agentskit/runtime), [`@agentskit/react`](https://www.npmjs.com/package/@agentskit/react), or [`@agentskit/ink`](https://www.npmjs.com/package/@agentskit/ink) — the adapter instance is the only provider-specific piece

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Adapter`, `EmbedFn`, types |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Headless `createRuntime` |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | `createRAG` + embedders |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Vector + chat memory backends |

## Docs

[Full documentation](https://emersonbraun.github.io/agentskit/)
