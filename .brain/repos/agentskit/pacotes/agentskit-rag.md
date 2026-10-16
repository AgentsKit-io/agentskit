---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/rag/package.json", "agentskit/packages/rag/src/index.ts", "agentskit/packages/rag/src/rag.ts", "agentskit/packages/rag/src/partitioned.ts", "agentskit/packages/rag/src/errors.ts", "agentskit-registry/registry/docs-chat/meta.json"]
npm: "@agentskit/rag"
tags: [pacote, repo/agentskit]
---

# @agentskit/rag

> [!tldr] Em linguagem comum
> Busca trechos de documentos para dar contexto à IA. Separa o texto, pede sua representação numérica e consulta o armazenamento escolhido pela aplicação.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-ask-backend]], [[agentskit-docs-next]], [[agentskit-example-rag-chat]], [[chat-example-shared]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-net]] |
| Outras dependências diretas/peer | `yaml`, `@aws-sdk/client-s3` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./chunker`, `./markdown`.

Nomes encontrados na entrada de código: `createRAG`, `createPartitionedRAG`, `RagError, RagErrorCodes`, `chunkText`, `loadUrl, loadGitHubFile, loadGitHubTree, loadNotionPage, loadConfluencePage, loadGoogleDriveFile, loadPdf, loadS3, loadGcs, loadDropbox, loadOneDrive,`, `voyageReranker, jinaReranker`, `createRerankedRetriever, createHybridRetriever, bm25Score, bm25Rerank,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê documentos e consultas; grava trechos e vetores na store injetada e devolve documentos recuperados. O provedor de embeddings recebe texto quando for remoto.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/rag/package.json:1`.
> - Entrada e composição: `agentskit/packages/rag/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/rag/src/rag.ts:62`.
> - Implementação exportada: `agentskit/packages/rag/src/partitioned.ts:25`.
> - Implementação exportada: `agentskit/packages/rag/src/errors.ts:9`.

## Consumo declarado no catálogo

[[00 Hub - agentskit-registry]] declara este pacote em 1 metadados de agentes. É vínculo de instalação do código copiado; não prova execução em produção.

> [!info]- Detalhe técnico
> - `agentskit-registry/registry/docs-chat/meta.json:1` — exemplo de declaração; contagem estática dos 346 meta.json no commit 49952c7.
