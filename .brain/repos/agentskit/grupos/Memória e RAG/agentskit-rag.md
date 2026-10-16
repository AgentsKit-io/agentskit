---
tipo: pacote
repo: agentskit
grupo: Memória e RAG
npm: "@agentskit/rag"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores por git grep; auditado em 2026-10-16"
fontes: ["packages/rag/package.json", "packages/rag/src/index.ts", "packages/rag/CONVENTIONS.md", "packages/rag/README.md", "packages/rag/tests/metro-bundle.test.ts", "apps/docs-next/content/docs/for-agents/rag.mdx", "AGENTS.md", "docs/architecture/adrs/0004-retriever-contract.md", "docs/architecture/adrs/0043-partition-bound-rag.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/memoria-e-rag]
---

# agentskit-rag

> [!tldr] Em linguagem comum
> Recuperação de contexto para o agente: divide documentos em trechos, guarda os vetores num armazenamento, e devolve os trechos mais parecidos com a pergunta. Também carrega documentos de URL, GitHub, Notion, Confluence, Drive, PDF, S3, GCS, Dropbox e OneDrive.

← [[00 Grupo - agentskit - Memória e RAG]]

## O que faz e por que existe

O pacote `@agentskit/rag` oferece `createRAG`, que devolve um `RAG` compatível com o contrato `Retriever` (ADR 0004) (`packages/rag/CONVENTIONS.md:3`). A fábrica é agnóstica de armazenamento: recebe `store` e `embed` por injeção (`CONVENTIONS.md:97`). Os armazenamentos ficam em `@agentskit/memory`, e os embedders em `@agentskit/adapters` (`CONVENTIONS.md:16-17`). Os carregadores de documentos e os rerankers também ficam aqui, porque são pequenos e não dependem de fornecedor (`CONVENTIONS.md:10-12`, `:18-21`). O pacote está em beta (`packages/rag/package.json:89-92`).

## API e contratos

Exports de `packages/rag/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createRAG` | função | Fábrica do RAG: `ingest` e `search` | `src/index.ts:1` |
| `createPartitionedRAG` (`PartitionedRAGConfig`, `PartitionSearchDiagnostics`) | função e tipos | RAG com partição por chave de tenant ou sessão (ADR 0043) | `src/index.ts:2-3` (`src/partitioned.ts`) |
| `RagError`, `RagErrorCodes`, `RagErrorCode` | classe, catálogo e tipo | Erros `AK_RAG_*` | `src/index.ts:4-5` |
| `chunkText` (`ChunkOptions`) | função e tipo | Divisão do texto em trechos | `src/index.ts:6`, `:8` |
| `RAGConfig`, `InputDocument`, `RAG` | tipos | Configuração, documento de entrada e contrato do RAG | `src/index.ts:7` |
| `loadUrl`, `loadGitHubFile`, `loadGitHubTree`, `loadNotionPage`, `loadConfluencePage`, `loadGoogleDriveFile`, `loadPdf`, `loadS3`, `loadGcs`, `loadDropbox`, `loadOneDrive` (+ tipos de opções) | funções e tipos | Carregadores de documentos | `src/index.ts:10-37` (`src/loaders.ts`) |
| `voyageReranker`, `jinaReranker` (+ tipos) | funções e tipos | Rerankers por API Voyage e Jina | `src/index.ts:39-40` (`src/rerankers.ts`) |
| `createRerankedRetriever`, `createHybridRetriever`, `bm25Score`, `bm25Rerank` (+ tipos) | funções e tipos | Composição de retriever com rerank, híbrido vetorial e BM25 | `src/index.ts:42-53` (`src/rerank.ts`) |

Subcaminhos publicados (`packages/rag/package.json:41-50`): `./chunker` e `./markdown`. Há também um ponto de entrada para navegador e React Native (`packages/rag/package.json:30-37`).

Exemplo real (README do pacote, `packages/rag/README.md:54-68`):

```ts
import { createRAG } from '@agentskit/rag'
import { openaiEmbedder } from '@agentskit/adapters'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
  store: fileVectorMemory({ path: './vectors' }),
})
```

Esse exemplo importa `@agentskit/adapters` e `@agentskit/memory`, que não estão em `packages/rag/package.json` (ver Dúvida abaixo).

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] e [[agentskit-net]] (`packages/rag/package.json:64-68`) |
| Dependência externa | `yaml` ^2.9.1 (`packages/rag/package.json:67`) |
| Peer opcional | `@aws-sdk/client-s3` (`packages/rag/package.json:69-76`), usado por `loadS3` |
| Consumidores dentro do repo | 4 manifestos declaram `@agentskit/rag` (busca em `packages` e `apps`, commit `9f8d8551`): `apps/ask-backend`, `apps/docs-next`, `apps/example-rag-chat` e `packages/cli`. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/rag.mdx` (`.doc-bridge/index.json`, `handoffs.rag`) |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Rede: os carregadores de URL, GitHub, Notion, Confluence, Drive, Dropbox, OneDrive e S3/GCS leem documentos remotos. O HTTP passa por `@agentskit/net`, e cancelamento e tempo limite são obrigatórios (`CONVENTIONS.md:45-54`). Rerankers chamam as APIs Voyage e Jina e aceitam `signal` (`CONVENTIONS.md:78-80`).
- S3: o cliente é injetado (`S3LikeClient`, `src/index.ts:33`); o pacote não cria credenciais.
- Variáveis de ambiente: nenhuma lida em `packages/rag/src` (busca sem resultado). A variável `OPENAI_API_KEY` aparece só no exemplo do README (`packages/rag/README.md:59`).
- Arquivos: `loadPdf` lê PDF (formato de entrada não verificado nesta auditoria).

## Como mexer (para agentes)

- **Comece por:** `packages/rag/src/rag.ts` (`createRAG`), `packages/rag/src/loaders.ts` (carregadores) e `packages/rag/CONVENTIONS.md` (regras).
- **Raiz de edição do handoff:** `packages/rag` (`.doc-bridge/index.json`, `handoffs.rag`).
- **Invariantes** (`packages/rag/CONVENTIONS.md:36-85`):
  - `createRAG` é agnóstico de armazenamento; não depender de um store específico (`:97`). O `RAG` continua estendendo `Retriever` (`:106`).
  - Chunker síncrono; `chunkSize` inválido vira um trecho só; overlap é limitado abaixo de `chunkSize` (`:38-43`).
  - Falha de carregamento lança `RagError` com `AK_RAG_LOAD_FAILED`; aborto nunca vira "pular documento" (`:47-49`).
  - Carregadores de lista podem pular falhas parciais, mas lançam erro se todas as tentativas falharem (`:55-59`). Paginação sem novo cursor lança erro (`:60-61`).
  - Scores: se algum existir, todos precisam ser finitos e a ordem é decrescente; nunca inventar score (`:71-74`).
  - Saída de reranker malformada lança `AK_RAG_RERANK_FAILED`, sem filtrar em silêncio (`:75-77`).
  - `createPartitionedRAG` sempre filtra depois da busca, mesmo quando o store aceita filtro (`:112-115`; ADR 0043).
  - `timeoutMs` padrão de 15 s (`:50-51`).
- **Testes:** `packages/rag/tests/` (inclui `rag.test.ts`, `hardening.test.ts`, `metro-bundle.test.ts`). `metro-bundle.test.ts` confirma que o pacote roda no bundle do Metro.
- **Validação do pacote:** `pnpm --filter @agentskit/rag test` (`packages/rag/package.json:57`, roda o build do turbo antes do vitest) e `pnpm --filter @agentskit/rag lint` (`:61`, `tsc --noEmit`). Cobertura de linhas: 95% (`CONVENTIONS.md:105`). Bundle abaixo de 10 KB gzip (`CONVENTIONS.md:104`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:95-100`): acoplar `RAG` a um store; dividir no meio de palavra; devolver resultados fora de ordem; completar até `topK`.

> [!question] Dúvida: dependências do exemplo do README
> `packages/rag/README.md:55-56` importa `@agentskit/adapters` e `@agentskit/memory`, e nenhum dos dois está em `packages/rag/package.json`. Ou o exemplo depende de dependências de desenvolvimento não declaradas, ou o README deveria usar outra forma de importar. Confirmar.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]] e [[agentskit ADR-0043 - Composição de RAG vinculada a partição]] (`createPartitionedRAG`).

Histórico recente (`git log --oneline -15 -- packages/rag`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `88c8bc7b feat(rag): add partition-bound retrieval (#1829)`
- `b3519ef3 feat(rag): markdown note parsing subpath (@agentskit/rag/markdown) (#1745)`

> [!info]- Detalhe técnico
> - `packages/rag/package.json:1` — manifesto, subcaminhos, peers opcionais e scripts.
> - `packages/rag/src/index.ts:1` — entrada pública.
> - `packages/rag/README.md:58` — exemplo `createRAG({ embed, store })`.
> - `apps/docs-next/content/docs/for-agents/rag.mdx:1` — handoff documental de agentes.
> - `packages/rag/CONVENTIONS.md:1` — invariantes e orientação de contribuição.

> [!info]- Evidência de uso no law-os (não verificada)
> A versão anterior desta nota fazia afirmações sobre o law-os, que dependem de notas e de um repositório fora deste vault. Foram retiradas desta versão até confirmação.
