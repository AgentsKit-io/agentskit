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
fontes: ["agentskit/apps/landing/package.json", "agentskit/apps/landing/app/page.tsx"]
tags: [app, repo/agentskit]
---

# @agentskit/landing

> [!tldr] Em linguagem comum
> Apresenta o framework em uma página independente, com exemplos, pacotes e convite à instalação.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | `next`, `posthog-js`, `react`, `react-dom` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

## Dados que entram e saem

Lê definições, estado, mensagens e componentes e devolve conteúdo e interações. O controlador ou aplicação escolhe o armazenamento e o provedor; não há um banco obrigatório neste workspace.

> [!info]- Detalhe técnico
> - `agentskit/apps/landing/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/landing/app/page.tsx:1` — entrada de código e composição
