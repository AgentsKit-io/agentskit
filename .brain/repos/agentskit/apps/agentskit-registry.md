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
fontes: ["agentskit/apps/registry/package.json", "agentskit/apps/registry/app/(home)/page.tsx"]
tags: [app, repo/agentskit]
---

# @agentskit/registry-app

> [!tldr] Em linguagem comum
> É a vitrine para procurar agentes, comparar opções e copiar comandos de instalação. Os dados vêm do repositório agentskit-registry.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[chat]], [[agentskit-core]], [[agentskit-react]], `@vinext/cloudflare`, `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `next`, `posthog-js`, `react`, `react-dom`, `react-server-dom-webpack`, `vinext`, `zod` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

Entradas nomeadas no código: `revalidate`, `metadata`.

## Dados que entram e saem

Lê catálogo remoto e artefato determinístico; guarda histórico Ask no navegador. Somente perguntas não resolvidas localmente seguem ao backend.

> [!info]- Detalhe técnico
> - `agentskit/apps/registry/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/registry/app/(home)/page.tsx:1` — entrada de código e composição
