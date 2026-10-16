---
tipo: pacote
repo: agentskit
grupo: Memória e RAG
npm: "@agentskit/rag"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/rag/package.json", "packages/rag/src/index.ts", "apps/docs-next/content/docs/for-agents/rag.mdx", "AGENTS.md", "packages/rag/CONVENTIONS.md", "packages/rag/tests/chunker.test.ts", "packages/rag/tests/errors.test.ts", "packages/rag/tests/hardening.test.ts", "packages/rag/tests/index-node.test.ts", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0004-retriever-contract.md", "docs/architecture/adrs/0006-runtime-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/memoria-e-rag]
---

# agentskit-rag

> [!tldr] Em linguagem comum
> Pacote rag do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Memória e RAG]]

## O que faz e por que existe

O pacote `@agentskit/rag` publica a superfície definida em `packages/rag/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/rag.mdx` e limita edições a `packages/rag`. Fonte: `packages/rag/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.rag`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createRAG` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:1` |
| `createPartitionedRAG` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:2` |
| `PartitionedRAGConfig` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:3` |
| `PartitionSearchDiagnostics` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:3` |
| `RagError` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:4` |
| `RagErrorCodes` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:4` |
| `RagErrorCode` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:5` |
| `chunkText` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:6` |
| `RAGConfig` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:7` |
| `InputDocument` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:7` |
| `RAG` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:7` |
| `ChunkOptions` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:8` |
| `{` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:23` |
| `voyageReranker` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:39` |
| `jinaReranker` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:39` |
| `VoyageRerankerOptions` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:40` |
| `JinaRerankerOptions` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:40` |
| `{` | export nomeado | API pública do pacote. | `packages/rag/src/index.ts:48` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `"import { createRAG } from '@agentskit/rag'; globalThis.__agentskitRag = createRAG;\n",` — `packages/rag/tests/metro-bundle.mjs:84`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-net]] (`packages/rag/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/rag.mdx` (`.doc-bridge/index.json`, `handoffs.rag`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: OPENAI_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/rag.mdx`, `packages/rag/CONVENTIONS.md` e `packages/rag/src/index.ts`.
- **Raiz de edição do handoff:** `packages/rag` (`.doc-bridge/index.json`, `handoffs.rag`).
- **Invariantes:** `timeoutMs` defaults to 15 seconds and must be a positive safe integer no greater than (`packages/rag/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/rag/tests/chunker.test.ts`, `packages/rag/tests/errors.test.ts`, `packages/rag/tests/hardening.test.ts`, `packages/rag/tests/index-node.test.ts`, `packages/rag/tests/loaders-native.test.ts`, `packages/rag/tests/loaders-node.test.ts`, `packages/rag/tests/loaders.test.ts`, `packages/rag/tests/markdown.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/rag test` e `pnpm --filter @agentskit/rag lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]], [[agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]], [[agentskit ADR-0023 - Perfil estrito de qualidade da documentação do ecossistema]], [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]], [[agentskit ADR-0027 - Limites de segurança do statechart beta]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]], [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]], [[agentskit ADR-0043 - Composição de RAG vinculada a partição]]. Histórico recente (`git log --oneline -15 -- packages/rag`):

- `e8d42064 chore: version packages (#1757)`
- `88c8bc7b feat(rag): add partition-bound retrieval (#1829)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `b3519ef3 feat(rag): markdown note parsing subpath (@agentskit/rag/markdown) (#1745)`

> [!info]- Detalhe técnico
> - `packages/rag/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/rag/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/rag.mdx:1` — handoff documental de agentes.
> - `packages/rag/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
