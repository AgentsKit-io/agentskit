---
sidebar_position: 3
---

# RAG (geração aumentada por recuperação)

Adicione recuperação de conhecimento aos seus agentes com RAG plug-and-play.

## Quando usar

- Você tem **documentos ou bases de conhecimento** para fundamentar respostas além dos pesos do modelo.
- Você já usa backends **vetoriais** de [`@agentskit/memory`](./memory) e um **embedder** de [`@agentskit/adapters`](./adapters).

`createRAG` conecta **fragmentar → embedar → armazenar → recuperar**; você ainda escolhe onde os vetores ficam (arquivo, Redis ou store customizado).

## Instalação

```bash
npm install @agentskit/rag @agentskit/memory @agentskit/adapters
```

## Início rápido

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

## Com o runtime

```ts
import { createRuntime } from '@agentskit/runtime'
import { openai } from '@agentskit/adapters'

const runtime = createRuntime({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  retriever: rag, // auto-injects retrieved context into prompts
})

const result = await runtime.run('Explain the AgentsKit architecture')
```

## Com React

```ts
import { useRAGChat } from '@agentskit/rag'
import { openai } from '@agentskit/adapters'

const chat = useRAGChat({
  adapter: openai({ apiKey: process.env.OPENAI_API_KEY!, model: 'gpt-4o' }),
  rag,
})
```

## Ciclo de vida: ingest vs retrieve

1. **`ingest(documents)`** — divide texto em chunks (veja Fragmentação), embeda cada chunk, faz upsert em `VectorMemory`. `id`s duplicados são sobrescritos conforme a semântica do backend.
2. **`retrieve(query, { topK, threshold? })`** — embeda a consulta, executa busca vetorial, devolve chunks ranqueados para o prompt.
3. **Runtime / `useRAGChat`** — chama `retrieve` (ou equivalente) por você a cada turno para o modelo ver contexto fresco.

Reingira quando os documentos de origem mudarem; não há watcher automático do sistema de arquivos.

## Superfície pública (resumo)

| Exportação | Papel |
|--------|------|
| `createRAG(config)` | Fábrica que devolve instância RAG com `ingest`, `retrieve` e superfície compatível com retriever |
| `useRAGChat` | Hook React: chat + wiring automático de recuperação |

## Fragmentação

Documentos são fragmentados automaticamente antes do embedding:

```ts
const rag = createRAG({
  embed: openaiEmbedder({ apiKey }),
  store: fileVectorMemory({ path: './vectors' }),
  chunkSize: 512,    // characters per chunk (default: 1000)
  chunkOverlap: 50,  // overlap between chunks (default: 100)
})
```

## Traga seu próprio embedder

Qualquer função no formato `(text: string) => Promise<number[]>` funciona:

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

## Armazenamentos vetoriais

O RAG funciona com qualquer `VectorMemory` de `@agentskit/memory`:

| Store | Ideal para |
|-------|----------|
| `fileVectorMemory` | Desenvolvimento local, conjuntos pequenos |
| `redisVectorMemory` | Produção, acesso rápido em rede |
| `VectorStore` customizado | LanceDB, Pinecone, Qdrant etc. |

## Solução de problemas

| Problema | O que verificar |
|-------|----------------|
| Sem resultados / baixa qualidade | Aumente `topK`, reduza `threshold` de similaridade, encurte `chunkSize` ou melhore a sobreposição de chunks. |
| Erros de dimensão | Tamanho da saída do embedder deve bater com `dimensions` do vector store (Redis) ou regras de inferência na primeira gravação. |
| Respostas desatualizadas | Rode `ingest` de novo após mudanças de conteúdo; limpe ou rotacione o caminho/índice vetorial se necessário. |
| Limites de taxa no ingest | Lotes menores; backoff entre chamadas `ingest`; use `ollamaEmbedder` local em dev. |

## Ver também

[Comece aqui](../getting-started/read-this-first) · [Pacotes](../packages/overview) · [TypeDoc](pathname:///agentskit/api-reference/) (`@agentskit/rag`) · [Memória](./memory) · [Adaptadores](./adapters) · [Runtime](../agents/runtime) · [Exemplo pipeline RAG](../examples/rag-pipeline) · [@agentskit/core](../packages/core)
