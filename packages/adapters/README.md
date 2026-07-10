# @agentskit/adapters

<p align="center"><img src="https://raw.githubusercontent.com/AgentsKit-io/agentskit/main/apps/docs-next/public/brand/logo-wordmark.svg" alt="AgentsKit" width="180" /></p>

Connect to any LLM provider — and swap between them — without touching your app code.

[![npm version](https://img.shields.io/npm/v/@agentskit/adapters?color=blue)](https://www.npmjs.com/package/@agentskit/adapters)
[![npm downloads](https://img.shields.io/npm/dm/@agentskit/adapters)](https://www.npmjs.com/package/@agentskit/adapters)
[![bundle size](https://img.shields.io/bundlejs/size/@agentskit/adapters?label=bundle)](https://bundlejs.com/?q=@agentskit/adapters)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
[![stability](https://img.shields.io/badge/stability-beta-yellow)](../../docs/STABILITY.md)
[![GitHub stars](https://img.shields.io/github/stars/AgentsKit-io/agentskit?style=social)](https://github.com/AgentsKit-io/agentskit)

**Tags:** `ai` · `agents` · `llm` · `agentskit` · `openai` · `anthropic` · `claude` · `gemini` · `chatgpt` · `ollama` · `embeddings` · `providers`

## How this fits the ecosystem

@agentskit/adapters is the provider layer: swap OpenAI, Anthropic, Gemini, Ollama, local models, and embedding providers without rewriting your agent.

- **AgentsKit**: compose it with the other packages in this repo to build agents from small, swappable parts.
- **Registry**: look for ready agents and templates that already use this layer at [registry.agentskit.io](https://registry.agentskit.io).
- **Playbook**: learn the production patterns behind this layer at [playbook.agentskit.io](https://playbook.agentskit.io).
- **AKOS**: run the same concepts with enterprise deployment, governance, and observability at [akos.agentskit.io](https://akos.agentskit.io).

Docs: [package guide](https://www.agentskit.io/docs/packages/adapters) · [agent handoff](https://github.com/AgentsKit-io/agentskit/blob/main/llms.txt)

## Why adapters

- **Vendor independence** — switch from OpenAI to Anthropic to a local Ollama model by changing one line; your hooks, runtime, and tools stay untouched
- **20+ providers included** — Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, Mistral, Cohere, Together, Groq, Fireworks, OpenRouter, Hugging Face, LM Studio, vLLM, llama.cpp, LangChain, Vercel AI SDK, and any raw `ReadableStream`
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

- Providers: Anthropic, OpenAI, Gemini, Ollama, DeepSeek, Grok, Kimi, Mistral, Cohere, Together, Groq, Fireworks, OpenRouter, Hugging Face, LM Studio, vLLM, llama.cpp, LangChain, LangGraph, Vercel AI SDK, generic `ReadableStream`
- Embedders: `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder`, `createOpenAICompatibleEmbedder`
- All adapters satisfy `Adapter` contract v1 (ADR 0001) — substitutable anywhere in the ecosystem
- Custom adapter authoring via `createAdapter()`
- Higher-order adapters: `createRouter` (cost/latency/classifier), `createEnsembleAdapter` (fan-out + merge), `createFallbackAdapter` (ordered try-next)

## Higher-order adapters

```ts
import { createRouter, anthropic, openai } from '@agentskit/adapters'

// Auto-pick cheapest capable candidate per request.
const router = createRouter({
  candidates: [
    { id: 'haiku', adapter: anthropic({ model: 'claude-haiku-4-5' }), cost: 0.25 },
    { id: 'sonnet', adapter: anthropic({ model: 'claude-sonnet-4-6' }), cost: 3 },
    { id: 'gpt-mini', adapter: openai({ model: 'gpt-4o-mini' }), cost: 0.15 },
  ],
})
```

See [Adapter router](https://www.agentskit.io/docs/recipes/adapter-router), [Ensemble](https://www.agentskit.io/docs/recipes/adapter-ensemble), and [Fallback chain](https://www.agentskit.io/docs/recipes/fallback-chain).

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
