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
fontes: ["agentskit/packages/tools/package.json", "agentskit/packages/tools/src/index.ts", "agentskit/packages/tools/src/web-search.ts", "agentskit/packages/tools/src/fetch-url.ts", "agentskit/packages/tools/src/safe-fetch.ts", "agentskit-registry/registry/clinical-patient-summary/meta.json"]
npm: "@agentskit/tools"
tags: [pacote, repo/agentskit]
---

# @agentskit/tools

> [!tldr] Em linguagem comum
> É a caixa de ferramentas executáveis: busca na Web, leitura de páginas, arquivos, comandos e integrações. A aplicação decide quais ações disponibilizar.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-integrations]], [[agentskit-net]], `ajv`, `better-sqlite3` |
| Usado por (produção/peer nestes dois repos) | [[agentskit-cli]], [[agentskit-mcp]], [[agentskit-ask-backend]], [[agentskit-docs-next]] |

Manifesto permite distribuição npm; a versão publicada não foi consultada.

## O que entrega

Subpaths do manifesto: `.`, `./mcp`, `./integrations`, `./mcp-devtools`, `./validation`.

## Dados que entram e saem

Recebe argumentos e executa operações locais ou HTTP conforme a ferramenta escolhida. Pode ler/gravar arquivos e chamar serviços externos.

> [!info]- Detalhe técnico
> - `agentskit/packages/tools/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/packages/tools/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/tools/src/web-search.ts:261`.
> - Implementação exportada: `agentskit/packages/tools/src/fetch-url.ts:96`.
> - Implementação exportada: `agentskit/packages/tools/src/safe-fetch.ts:45`.

## Consumo declarado no catálogo

[[00 Hub - agentskit-registry]] declara este pacote em 345 metadados de agentes. É vínculo de instalação do código copiado; não prova execução em produção.

> [!info]- Detalhe técnico
> - `agentskit-registry/registry/clinical-patient-summary/meta.json:1` — exemplo de declaração; contagem estática dos 346 meta.json no commit 49952c7.
