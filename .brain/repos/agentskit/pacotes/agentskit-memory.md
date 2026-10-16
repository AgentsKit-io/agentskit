---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  law-os: 371860a
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/memory/package.json", "agentskit/packages/memory/src/index.ts", "agentskit/packages/memory/src/file-chat.ts", "agentskit/packages/memory/src/web-storage.ts", "agentskit/packages/memory/src/sqlite.ts", "agentskit-registry/registry/docs-chat/meta.json", "law-os/apps/law-os/backend/compose.mjs", "law-os/apps/law-os/backend/worker/features.mjs", "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"]
npm: "@agentskit/memory"
tags: [pacote, repo/agentskit]
---

# @agentskit/memory

> [!tldr] Em linguagem comum
> Guarda conversas e informações recuperáveis entre chamadas. Oferece diferentes lugares de armazenamento; a aplicação escolhe o backend e sua política de retenção.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-docs-next]], [[agentskit-example-ink]], [[chat]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-net]] |
| Outras dependências diretas/peer | `vectra`, `drizzle-orm`, `pg` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./personalization`, `./web-storage`, `./postgres`.

Nomes encontrados na entrada de código: `fileChatMemory`, `createWebStorageMemory`, `sqliteChatMemory`, `tursoChatMemory`, `redisChatMemory`, `redisVectorMemory`, `fileVectorMemory`, `createInMemoryPersonalization, renderProfileContext,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê e grava mensagens, registros e vetores no backend escolhido (arquivo, SQLite, Redis, Turso, PostgreSQL e opções por subpath). Não existe um banco único obrigatório.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/memory/package.json:1`.
> - Entrada e composição: `agentskit/packages/memory/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/memory/src/file-chat.ts:24`.
> - Implementação exportada: `agentskit/packages/memory/src/web-storage.ts:89`.
> - Implementação exportada: `agentskit/packages/memory/src/sqlite.ts:55`.

## Consumo declarado no catálogo

[[00 Hub - agentskit-registry]] declara este pacote em 1 metadados de agentes. É vínculo de instalação do código copiado; não prova execução em produção.

> [!info]- Detalhe técnico
> - `agentskit-registry/registry/docs-chat/meta.json:1` — exemplo de declaração; contagem estática dos 346 meta.json no commit 49952c7.

## No law-os

É dependência declarada no backend. A revisão documentada não demonstra ativação de memória de agente; os stores de runs/documentos pertencem à plataforma e são outro tipo de persistência.

| Momento | Uso no produto |
|---|---|
| Antes / fora da execução | Papel descrito acima; composição não implica chamada em cada run. |
| [[Revisão de contratos - law-os]] | Não há etapa dedicada demonstrada para este pacote; veja a composição e os limites acima. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.
