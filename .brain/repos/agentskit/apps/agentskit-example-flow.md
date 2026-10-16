---
tipo: app
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/apps/example-flow/package.json", "agentskit/apps/example-flow/src/index.ts"]
tags: [app, repo/agentskit]
---

# @agentskit/example-flow

> [!tldr] Em linguagem comum
> Lê um fluxo YAML e guarda um registro JSONL para reaproveitar etapas concluídas depois de uma interrupção.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-runtime]], `yaml` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Lê `flow.yaml` e a API do GitHub; grava `.agentskit/flow.jsonl` para retomada.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-flow/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/example-flow/src/index.ts:1` — entrada de código e composição
