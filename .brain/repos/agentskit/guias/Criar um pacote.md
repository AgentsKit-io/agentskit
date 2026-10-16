---
tipo: guia
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; comandos conferidos em package.json e CONTRIBUTING.md; pnpm não executado; auditado em 2026-10-16"
fontes:
  - "AGENTS.md"
  - "CONTRIBUTING.md"
  - "package.json"
  - "packages/core/README.md"
  - "docs/STABILITY.md"
  - "docs/architecture/adrs/README.md"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Criar um pacote

> [!tldr] Em linguagem comum
> Use ao adicionar um pacote independente ao framework: pasta, manifesto, código público, testes e documentação para agentes.

← [[00 Hub - agentskit]]

## Quando usar

Ao criar um pacote novo em `packages/<nome>` que faça parte do framework público.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md:26-27`).
- Checkout atualizado; leia o handoff de um pacote vizinho antes de começar.

## Passos

1. Leia `AGENTS.md`, `CONTRIBUTING.md`, `docs/STABILITY.md` (estabilidade e graduação), os ADRs aplicáveis em `docs/architecture/adrs/README.md` e o `CONVENTIONS.md` de um pacote vizinho.
2. Confira a rota do pacote com `pnpm exec ak-docs query package <nome> --agent` (`AGENTS.md:67`).
3. Crie `packages/<nome>` com manifesto, `src/index.ts`, README, `CONVENTIONS.md`, testes e a documentação de agentes em `apps/docs-next/content/docs/for-agents/`. Use como modelo um pacote do mesmo tipo.
4. Declare dependências `workspace:*` só quando necessárias.
5. Para mudança voltada ao usuário, gere o changeset com `pnpm changeset` (`CONTRIBUTING.md:145`).

## Como validar

- `pnpm --filter @agentskit/<nome> lint`, `pnpm --filter @agentskit/<nome> test` e `pnpm --filter @agentskit/<nome> build`.
- `pnpm check:quality-gates` (`package.json:31`).
- Para o pacote `core`, também `pnpm size` (`CONTRIBUTING.md:122`; script em `package.json:66`).

## Erros comuns

- O core é zero-dependência e tem orçamento de 10 KB gzip, aplicado no CI (`packages/core/README.md:7` e `:39`). Não adicione dependência de runtime a ele.
- Mudança de contrato exige ADR (ver `docs/architecture/adrs/README.md`), não só código.

## Notas relacionadas

- [[agentskit-core]]
- [[Rodar a documentação]]
- [[Publicar no npm com Changesets]]
