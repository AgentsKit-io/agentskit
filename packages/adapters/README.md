# @agentskit/adapters

Connect to any LLM provider — and swap between them — without touching your app code.

[![npm version](https://img.shields.io/npm/v/@agentskit/adapters?color=blue)](https://www.npmjs.com/package/@agentskit/adapters)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/adapters)](https://www.npmjs.com/package/@agentskit/adapters)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@agentskit/adapters)](https://bundlephobia.com/package/@agentskit/adapters)
[![license](https://img.shields.io/npm/l/@agentskit/adapters)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-stable-brightgreen)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `claude` · `gemini` · `chatgpt` · `ollama` · `embeddings` · `providers`

## Why adapters

- **Vendor independence** — switch from OpenAI to Anthropic to a local Ollama model by changing one line; your hooks, runtime, and tools stay untouched
- **10+ providers included** — Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, LangChain, Vercel AI SDK, and any raw `ReadableStream`
- **Embedder functions built in** — the same adapter pattern covers text embeddings, so you can reuse provider config for both chat and RAG
- **One-line local AI** — `ollama({ model: 'llama3.1' })` for fully offline agents with no API key required

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

## Features

- Providers: Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, LangChain, LangGraph, Vercel AI SDK, generic `ReadableStream`
- Embedders: `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`
- All adapters satisfy `Adapter` contract v1 (ADR 0001) — substitutable anywhere in the ecosystem
- Custom adapter authoring via `createAdapter()`

## Ecosystem

| Package | Role |
|---------|------|
| [@agentskit/core](https://www.npmjs.com/package/@agentskit/core) | `Adapter`, `EmbedFn`, types |
| [@agentskit/runtime](https://www.npmjs.com/package/@agentskit/runtime) | Headless `createRuntime` |
| [@agentskit/rag](https://www.npmjs.com/package/@agentskit/rag) | `createRAG` + embedders |
| [@agentskit/memory](https://www.npmjs.com/package/@agentskit/memory) | Vector + chat memory backends |

## Testing Adapters

Three built-in utilities let you test agents without hitting a real LLM.

### `mockAdapter` — deterministic responses

```ts
import { mockAdapter } from '@agentskit/adapters'

const adapter = mockAdapter({
  response: [
    { type: 'text', content: 'Hello!' },
    { type: 'done' },
  ],
})
```

Pass a function to make responses request-aware, or pass an array of arrays to return different chunks on each call (sequenced mode). Use the optional `history` array to capture every request for assertions.

### `recordingAdapter` + `inMemorySink` — capture real calls

```ts
import { recordingAdapter, inMemorySink, anthropic } from '@agentskit/adapters'

const sink = inMemorySink()
const adapter = recordingAdapter(
  anthropic({ apiKey: process.env.ANTHROPIC_API_KEY!, model: 'claude-sonnet-4-6' }),
  sink,
)
// Runs the real LLM and captures every chunk to sink.fixture
```

### `replayAdapter` — replay captured fixtures

```ts
import { replayAdapter } from '@agentskit/adapters'
import fixture from './fixture.json'

const adapter = replayAdapter(fixture) // no network calls
```

Typical workflow: record once in dev → commit JSON fixture → replay in CI.

## Contributors

<a href="https://github.com/AgentsKit-io/agentskit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=AgentsKit-io/agentskit" alt="AgentsKit contributors" />
</a>

## License

MIT — see [LICENSE](../../LICENSE).

## Docs

[Full documentation](https://www.agentskit.io) · [GitHub](https://github.com/AgentsKit-io/agentskit)
