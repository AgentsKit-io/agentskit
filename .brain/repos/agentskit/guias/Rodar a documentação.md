---
tipo: guia
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; comandos conferidos em package.json e apps/docs-next/package.json; nenhum comando executado; auditado em 2026-10-16"
fontes:
  - "AGENTS.md"
  - "CONTRIBUTING.md"
  - "package.json"
  - "apps/docs-next/package.json"
  - "apps/docs-next/scripts/docs-new.mjs"
  - "doc-bridge.config.json"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Rodar a documentação

> [!tldr] Em linguagem comum
> Use para rodar o site de documentação, escrever ou validar o conteúdo canônico e gerar o índice para agentes.

← [[00 Hub - agentskit]]

## Quando usar

Ao escrever ou validar páginas de `apps/docs-next`, ou ao atualizar o índice do Doc Bridge.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md:26-27`).
- Checkout atualizado e dependências instaladas com `pnpm install` (`CONTRIBUTING.md:35`).

## Passos

1. Instale as dependências: `pnpm install` (`CONTRIBUTING.md:35`).
2. Consulte o handoff de um pacote: `pnpm exec ak-docs query package <id> --agent` (`AGENTS.md:67`).
3. Rode o site: `pnpm docs` (`package.json:41`), que executa `pnpm --filter @agentskit/docs-next dev` (`apps/docs-next/package.json:16`, `next dev --turbo`).
4. Crie uma página de guia: `pnpm --filter @agentskit/docs-next exec node scripts/docs-new.mjs guide <slug>` (`apps/docs-next/scripts/docs-new.mjs:15`, `:20`).
5. Depois de alterar o corpus, gere o índice: `pnpm docs:bridge:index` (`package.json:45`), que roda `ak-docs index` e `scripts/sync-repo-llms.mjs`.

## Como validar

- `pnpm --filter @agentskit/docs-next lint` (`apps/docs-next/package.json:19`: gera o contexto do Ask e roda `tsc --noEmit`).
- `pnpm --filter @agentskit/docs-next test` (`apps/docs-next/package.json:20`).
- `pnpm docs:bridge:gate` (`package.json:46`) e `pnpm docs:bridge:doctor` (`package.json:49`).

## Erros comuns

- `pnpm docs:deploy` publica em produção, via `vercel deploy --prod` (`package.json:43`). Use só com autorização explícita e revisão, porque é um efeito externo.
- Um build bem-sucedido não comprova que a publicação chegou ao destino ativo.

## Notas relacionadas

- [[agentskit-docs-next]]
- [[Criar um pacote]]
- [[Publicar no npm com Changesets]]
