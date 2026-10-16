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
fontes: ["agentskit/apps/example-ink/package.json", "agentskit/apps/example-ink/src/index.tsx"]
tags: [app, repo/agentskit]
---

# @agentskit/example-ink

> [!tldr] Em linguagem comum
> Demonstra conversa no terminal, uma ferramenta de horário e memória em arquivo.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-core]], [[agentskit-ink]], [[agentskit-memory]], `ink`, `react` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Recebe texto no terminal e grava histórico em arquivo na demonstração do framework.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-ink/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/example-ink/src/index.tsx:1` — entrada de código e composição
