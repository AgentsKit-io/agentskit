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
fontes: ["agentskit/apps/docs-next/package.json", "agentskit/apps/docs-next/app/(home)/page.tsx"]
tags: [app, repo/agentskit]
---

# @agentskit/docs-next

> [!tldr] Em linguagem comum
> É o site de documentação, com guias, referência, busca e conversa. Também fornece a estrutura visual compartilhada por outras propriedades.

← [[00 Hub - agentskit]]

## Papel e relações

| Relação | Peças |
|---|---|
| Depende de (produção/peer) | [[agentskit-adapters]], [[chat]], [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-eval]], [[agentskit-memory]], [[agentskit-net]], [[agentskit-observability]], [[agentskit-rag]], [[agentskit-react]], [[agentskit-runtime]], [[agentskit-sandbox]], [[agentskit-skills]], [[agentskit-tools]], `@codesandbox/sandpack-react`, `@huggingface/transformers`, `@tailwindcss/postcss`, `@vercel/analytics`, `@vercel/speed-insights`, `@vinext/cloudflare`, `fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `mermaid`, `motion`, `next`, `postcss`, `react`, `react-dom`, `react-markdown`, `react-server-dom-webpack`, `remark-gfm`, `shiki`, `tailwindcss`, `vinext`, `yaml`, `zod` |
| Usado por (produção/peer nestes dois repos) | Nenhum workspace do inventário; consumidores externos não foram enumerados. |

Workspace interno com código público; `private: true` impede publicação npm independente.

## O que entrega

Aplicação executada pelos scripts do manifesto; não declara subpaths de biblioteca.

Entradas nomeadas no código: `metadata`.

## Dados que entram e saem

Lê MDX e referência e gera páginas e índices. O widget Ask usa o backend compartilhado.

> [!info]- Detalhe técnico
> - `agentskit/apps/docs-next/package.json:1` — identidade, dependências, scripts e exports
> - `agentskit/apps/docs-next/app/(home)/page.tsx:1` — entrada de código e composição
