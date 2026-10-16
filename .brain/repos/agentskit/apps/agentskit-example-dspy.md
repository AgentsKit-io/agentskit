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
fontes: ["agentskit/apps/example-dspy/package.json", "agentskit/apps/example-dspy/src/index.ts", "agentskit/apps/example-dspy/src/dataset.ts", "agentskit/apps/example-dspy/src/agent.ts"]
tags: [app, repo/agentskit]
---

# @agentskit/example-dspy

> [!tldr] Em linguagem comum
> Compara variantes de instruções usando regras e fatos locais para exercitar métricas de avaliação.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-eval]] |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Lê variantes de prompts e casos locais; produz resultados e métricas.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-dspy/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/example-dspy/src/index.ts:1` — entrada de código e composição

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/apps/example-dspy/src/dataset.ts:11`.
> - Implementação exportada: `agentskit/apps/example-dspy/src/agent.ts:10`.
