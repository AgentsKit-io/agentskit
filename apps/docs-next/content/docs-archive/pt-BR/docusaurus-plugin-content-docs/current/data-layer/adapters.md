---
sidebar_position: 1
---

# Adaptadores

`@agentskit/adapters` normaliza cada provedor de IA suportado numa única interface de streaming. Troque de provedor mudando uma linha — o restante do app permanece igual.

## Quando usar

- Você precisa de um **`AdapterFactory`** plugável para [`useChat`](../hooks/use-chat), [`createRuntime`](../agents/runtime) ou [`createChatController`](../packages/core).
- Você precisa de **embedders** para [`@agentskit/rag`](./rag) ou memória vetorial.

Se você só usa uma rota hospedada (por exemplo handler do Vercel AI SDK), `vercelAI` (abaixo) pode bastar sem outros pacotes de provedor.

## Instalação

```bash
npm install @agentskit/adapters
```

Peer: [`@agentskit/core`](../packages/core) (puxado pelos pacotes de UI/runtime).

## Superfície pública (resumo)

| Categoria | Exportações |
|----------|---------|
| Adaptadores de chat | `anthropic`, `openai`, `gemini`, `ollama`, `deepseek`, `grok`, `kimi`, `langchain`, `langgraph`, `vercelAI`, `generic`, `createAdapter` |
| Embedders | `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder`, `createOpenAICompatibleEmbedder` |
| Tipos | `CreateAdapterConfig`, `GenericAdapterConfig`, `*Config` específicos de provedor, configs de embedder |

## Provedores embutidos

### Anthropic

```ts
import { anthropic } from '@agentskit/adapters'

const adapter = anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-6',
  maxTokens: 4096,       // optional, default 4096
  baseUrl: 'https://api.anthropic.com', // optional
})
```

### OpenAI

```ts
import { openai } from '@agentskit/adapters'

const adapter = openai({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  baseUrl: 'https://api.openai.com', // optional
})
```

### Gemini

```ts
import { gemini } from '@agentskit/adapters'

const adapter = gemini({
  apiKey: process.env.GOOGLE_API_KEY!,
  model: 'gemini-2.0-flash',
})
```

### Ollama (local)

```ts
import { ollama } from '@agentskit/adapters'

const adapter = ollama({
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434', // optional
})
```

### DeepSeek

```ts
import { deepseek } from '@agentskit/adapters'

const adapter = deepseek({ apiKey: process.env.DEEPSEEK_API_KEY!, model: 'deepseek-chat' })
```

### Grok

```ts
import { grok } from '@agentskit/adapters'

const adapter = grok({ apiKey: process.env.XAI_API_KEY!, model: 'grok-3' })
```

### Kimi

```ts
import { kimi } from '@agentskit/adapters'

const adapter = kimi({ apiKey: process.env.KIMI_API_KEY!, model: 'moonshot-v1-8k' })
```

### LangChain / LangGraph

```ts
import { langchain, langgraph } from '@agentskit/adapters'
import { ChatOpenAI } from '@langchain/openai'

// Wrap any LangChain runnable
const adapter = langchain({
  runnable: new ChatOpenAI({ model: 'gpt-4o' }),
  mode: 'stream', // or 'events' for streamEvents()
})

// LangGraph: uses streamEvents under the hood
const graphAdapter = langgraph({ graph: myCompiledGraph })
```

### Vercel AI SDK

```ts
import { vercelAI } from '@agentskit/adapters'

// Points at a Next.js / Vercel AI route handler
const adapter = vercelAI({
  api: '/api/chat',
  headers: { 'X-Custom-Header': 'value' }, // optional
})
```

## Troca de provedor em uma linha

```ts
// Before
const adapter = anthropic({ apiKey, model: 'claude-sonnet-4-6' })

// After — nothing else changes
const adapter = openai({ apiKey, model: 'gpt-4o' })
```

## Adaptador customizado com `createAdapter`

Use `createAdapter` quando precisar de um provedor não listado acima. Forneça uma função `send` que devolva `Response` ou `ReadableStream`, e um gerador `parse` que produza valores `StreamChunk`.

```ts
import { createAdapter } from '@agentskit/adapters'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'

const adapter = createAdapter({
  send: async (request: AdapterRequest) => {
    return fetch('https://my-llm.example.com/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: request.messages }),
    })
  },
  parse: async function* (stream: ReadableStream): AsyncIterableIterator<StreamChunk> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield { type: 'text', content: decoder.decode(value) }
    }
    yield { type: 'done' }
  },
  abort: () => { /* optional cancel logic */ },
})
```

Para o caso mais simples — um stream que emite texto bruto — use `generic`:

```ts
import { generic } from '@agentskit/adapters'

const adapter = generic({
  send: async (request) => {
    const res = await fetch('/api/my-llm', {
      method: 'POST',
      body: JSON.stringify({ messages: request.messages }),
    })
    return res.body!
  },
})
```

## Funções embedder

Embedders retornam um `EmbedFn` — `async (text: string) => number[]` — usado por `@agentskit/rag` e `@agentskit/memory`.

```ts
import {
  openaiEmbedder,
  geminiEmbedder,
  ollamaEmbedder,
  deepseekEmbedder,
  grokEmbedder,
  kimiEmbedder,
  createOpenAICompatibleEmbedder,
} from '@agentskit/adapters'

// OpenAI (default model: text-embedding-3-small)
const embed = openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! })

// Gemini
const embed = geminiEmbedder({ apiKey: process.env.GOOGLE_API_KEY!, model: 'text-embedding-004' })

// Ollama (local)
const embed = ollamaEmbedder({ model: 'nomic-embed-text' })

// OpenAI-compatible endpoint (Cohere, Voyage, etc.)
const embed = createOpenAICompatibleEmbedder({
  apiKey: process.env.COHERE_API_KEY!,
  model: 'embed-english-v3.0',
  baseUrl: 'https://api.cohere.com',
})
```

Passe qualquer embedder direto a `createRAG` — veja [RAG](./rag.md).

## Armadilhas de `createAdapter`

- Seu gerador **`parse`** deve eventualmente produzir `{ type: 'done' }` (e chunks de ferramenta se o provedor faz stream de tool calls), senão os consumidores ficam presos em `streaming`.
- **`abort`** deve cancelar a requisição HTTP subjacente ou o reader para que `stop()` na UI funcione.
- Reutilize o formato **`AdapterRequest`**: os modelos esperam `messages` estilo OpenAI mais definições de ferramenta quando as ferramentas estão habilitadas.

## Solução de problemas

| Problema | O que verificar |
|-------|----------------|
| 401 / 403 | Variáveis de ambiente de chave de API e `baseUrl` para gateways self-hosted. |
| Stream vazio | `parse` não decodifica SSE ou NDJSON; compare com `generic` + rota comprovada. |
| Erros JSON de ferramenta | Limites de schema de ferramenta por provedor; encurte `description` ou simplifique o schema. |
| Incompatibilidade de dimensão do embedder | `dimensions` do índice vetorial deve bater com o modelo (por exemplo 1536 para muitos embeddings OpenAI). |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/adapters`) · [Memória](./memory) · [RAG](./rag) · [useChat](../hooks/use-chat) · [@agentskit/core](../packages/core)
