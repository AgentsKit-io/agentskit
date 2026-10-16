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
fontes: ["agentskit/apps/example-react/package.json", "agentskit/apps/example-react/src/App.tsx"]
tags: [app, repo/agentskit]
---

# @agentskit/example-react

> [!tldr] Em linguagem comum
> Demonstra uma conversa React com componentes e controlador compartilhados.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-react]], `react`, `react-dom` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit/apps/example-react/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/example-react/src/App.tsx:1` — entrada de código e composição
