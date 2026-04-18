---
sidebar_position: 1
---

# Adaptadores

`@agentskit/adapters` normaliza cada proveedor de IA soportado en una única interfaz de streaming. Cambia de proveedor con una sola línea — el resto de la aplicación sigue igual.

## Cuándo usarlo

- Necesitas un **`AdapterFactory` listo para usar** para [`useChat`](../hooks/use-chat), [`createRuntime`](../agents/runtime) o [`createChatController`](../packages/core).
- Necesitas **embedders** para [`@agentskit/rag`](./rag) o memoria vectorial.

Si solo usas una ruta alojada (p. ej. handler de Vercel AI SDK), `vercelAI` (más abajo) puede bastar sin otros paquetes de proveedor.

## Instalación

```bash
npm install @agentskit/adapters
```

Peer: [`@agentskit/core`](../packages/core) (traído por los paquetes de UI/runtime).

## Superficie pública (resumen)

| Categoría | Exportaciones |
|----------|---------|
| Adaptadores de chat | `anthropic`, `openai`, `gemini`, `ollama`, `deepseek`, `grok`, `kimi`, `langchain`, `langgraph`, `vercelAI`, `generic`, `createAdapter` |
| Embedders | `openaiEmbedder`, `geminiEmbedder`, `ollamaEmbedder`, `deepseekEmbedder`, `grokEmbedder`, `kimiEmbedder`, `createOpenAICompatibleEmbedder` |
| Tipos | `CreateAdapterConfig`, `GenericAdapterConfig`, `*Config` específicos de proveedor, configs de embedder |

## Proveedores integrados

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

## Cambio de proveedor en una línea

```ts
// Antes
const adapter = anthropic({ apiKey, model: 'claude-sonnet-4-6' })

// Después — no cambia nada más
const adapter = openai({ apiKey, model: 'gpt-4o' })
```

## Adaptador personalizado con `createAdapter`

Usa `createAdapter` cuando necesites un proveedor no listado arriba. Proporciona una función `send` que devuelva un `Response` o `ReadableStream`, y un generador `parse` que produzca valores `StreamChunk`.

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

Para el caso más simple — un stream que emite texto en bruto — usa `generic`:

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

## Funciones embedder

Los embedders devuelven un `EmbedFn` — un `async (text: string) => number[]` — usado por `@agentskit/rag` y `@agentskit/memory`.

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

Pasa cualquier embedder directamente a `createRAG` — ve [RAG](./rag.md).

## Trampas de `createAdapter`

- Tu generador **`parse`** debe acabar emitiendo `{ type: 'done' }` (y fragmentos de herramienta si el proveedor hace stream de llamadas a herramientas) o los consumidores se quedarán en `streaming`.
- **`abort`** debería cancelar la petición HTTP subyacente o el lector para que `stop()` en la UI funcione.
- Reutiliza la forma de **`AdapterRequest`**: los modelos esperan `messages` estilo OpenAI más definiciones de herramienta cuando están activas.

## Solución de problemas

| Problema | Qué revisar |
|-------|----------------|
| 401 / 403 | Variables de entorno de API key y `baseUrl` para gateways autoalojados. |
| Stream vacío | `parse` no decodifica SSE o NDJSON; compara con `generic` + ruta conocida buena. |
| Errores JSON de herramientas | Límites de schema por proveedor; acorta `description` o simplifica el schema. |
| Desajuste de dimensión del embedder | Las `dimensions` del índice vectorial deben coincidir con el modelo (p. ej. 1536 para muchos embeddings de OpenAI). |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/adapters`) · [Memoria](./memory) · [RAG](./rag) · [useChat](../hooks/use-chat) · [@agentskit/core](../packages/core)
