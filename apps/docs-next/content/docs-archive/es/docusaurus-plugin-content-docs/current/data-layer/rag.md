---
sidebar_position: 3
---

# RAG (generación aumentada por recuperación)

Añade recuperación de conocimiento a tus agentes con RAG plug-and-play.

## Cuándo usarlo

- Tienes **documentos o bases de conocimiento** para fundamentar respuestas más allá de los pesos del modelo.
- Ya usas backends **vectoriales** de [`@agentskit/memory`](./memory) y un **embedder** de [`@agentskit/adapters`](./adapters).

`createRAG` conecta **fragmentar → incrustar → almacenar → recuperar**; tú eliges dónde viven los vectores (archivo, Redis o almacén personalizado).

## Instalación

```bash
npm install @agentskit/rag @agentskit/memory @agentskit/adapters
```

## Inicio rápido

```ts
import { createRAG } from '@agentskit/rag'
import { openaiEmbedder } from '@agentskit/adapters'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY }),
  store: fileVectorMemory({ path: './vectors' }),
})

// Ingest documents
await rag.ingest([
  { id: 'doc-1', content: 'AgentsKit is a JavaScript agent toolkit...' },
  { id: 'doc-2', content: 'The runtime supports ReAct loops...' },
])

// Retrieve relevant context
const docs = await rag.retrieve('How does AgentsKit work?', { topK: 3 })
```

## Con el runtime

```ts
import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  retriever: rag, // auto-injects retrieved context into prompts
})

const result = await runtime.run('Explain the AgentsKit architecture')
```

## Con React

```ts
import { useRAGChat } from '@agentskit/rag'
import { openai } from '@agentskit/adapters'

const chat = useRAGChat({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  rag,
})
```

## Ciclo de vida: ingestión frente a recuperación

1. **`ingest(documents)`** — divide el texto en fragmentos (véase Fragmentación), incrusta cada fragmento y hace upsert en `VectorMemory`. Los `id` duplicados se sobrescriben según la semántica del backend.
2. **`retrieve(query, { topK, threshold? })`** — incrusta la consulta, ejecuta búsqueda vectorial y devuelve fragmentos ordenados para el prompt.
3. **Runtime / `useRAGChat`** — llaman a `retrieve` (o equivalente) en tu nombre en cada turno para que el modelo vea contexto actualizado.

Vuelve a ingerir cuando cambien los documentos de origen; no hay observador automático del sistema de archivos.

## Superficie pública (resumen)

| Exportación | Función |
|--------|------|
| `createRAG(config)` | Fábrica que devuelve una instancia RAG con `ingest`, `retrieve` y superficie compatible con recuperadores |
| `useRAGChat` | Hook de React: chat + cableado automático de recuperación |

## Fragmentación

Los documentos se fragmentan automáticamente antes de incrustarlos:

```ts
const rag = createRAG({
  embed: openaiEmbedder({ apiKey }),
  store: fileVectorMemory({ path: './vectors' }),
  chunkSize: 512,    // characters per chunk (default: 1000)
  chunkOverlap: 50,  // overlap between chunks (default: 100)
})
```

## Trae tu propio embedder

Cualquier función que coincida con `(text: string) => Promise<number[]>` sirve:

```ts
import { openaiEmbedder, geminiEmbedder, ollamaEmbedder } from '@agentskit/adapters'

openaiEmbedder({ apiKey, model: 'text-embedding-3-small' })
geminiEmbedder({ apiKey })
ollamaEmbedder({ model: 'nomic-embed-text' })

// Custom
const myEmbedder = async (text: string) => {
  const response = await fetch('/api/embed', { method: 'POST', body: text })
  return response.json()
}
```

## Almacenes vectoriales

RAG funciona con cualquier `VectorMemory` de `@agentskit/memory`:

| Almacén | Ideal para |
|-------|----------|
| `fileVectorMemory` | Desarrollo local, conjuntos pequeños |
| `redisVectorMemory` | Producción, acceso en red rápido |
| `VectorStore` personalizado | LanceDB, Pinecone, Qdrant, etc. |

## Solución de problemas

| Problema | Qué revisar |
|-------|----------------|
| Sin resultados / baja calidad | Aumenta `topK`, baja el umbral de similitud `threshold`, acorta `chunkSize` o mejora el solapamiento de fragmentos. |
| Errores de dimensión | El tamaño de salida del embedder debe coincidir con `dimensions` del almacén vectorial (Redis) o las reglas de inferencia en la primera escritura. |
| Respuestas obsoletas | Vuelve a ejecutar `ingest` tras cambios de contenido; borra o rota la ruta/índice vectorial si hace falta. |
| Límites de tasa en la ingestión | Fragmenta en lotes más pequeños; espera entre llamadas a `ingest`; usa `ollamaEmbedder` local en desarrollo. |

## Ver también

[Empieza aquí](../getting-started/read-this-first) · [Paquetes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/rag`) · [Memoria](./memory) · [Adaptadores](./adapters) · [Runtime](../agents/runtime) · [Ejemplo de pipeline RAG](../examples/rag-pipeline) · [@agentskit/core](../packages/core)
