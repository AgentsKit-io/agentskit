---
tipo: guia
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "inspeção estática; .doc-bridge/index.json versionado consultado; pnpm ausente, índice não atualizado"
fontes:
  - "AGENTS.md"
  - "CONTRIBUTING.md"
  - "package.json"
  - "doc-bridge.config.json"
  - "docs/architecture/adrs/README.md"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Criar um pacote

> [!tldr] Em linguagem comum
> Use ao adicionar pacote independente ao framework.

← [[00 Hub - agentskit]]

## Quando usar

Use ao adicionar pacote independente ao framework.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md`).
- Checkout atualizado; leia instruções e handoff antes de editar pacote.

## Passos

- Leia `AGENTS.md`, `CONTRIBUTING.md`, `docs/STABILITY.md`, ADRs aplicáveis e `CONVENTIONS.md` do pacote vizinho.
- Verifique a rota: `pnpm exec ak-docs query package <nome> --agent` (`AGENTS.md:34`).
- Crie pasta em `packages/<nome>`, manifesto, `src/index.ts`, README, CONVENTIONS, testes Vitest e handoff `for-agents`.
- Adicione relações ao corpus e dependências workspace apenas quando necessárias.
- Para mudança voltada ao usuário: `pnpm changeset`.

## Como validar

`pnpm --filter @agentskit/<nome> lint`, `pnpm --filter @agentskit/<nome> test`, `pnpm --filter @agentskit/<nome> build`, `pnpm check:quality-gates`; core adicionalmente `pnpm size`.

## Erros comuns

O core v1 tem zero dependências runtime e teto 10 KB gzip; alteração de contrato requer ADR e bump coordenado.

## Notas relacionadas

Consulte o hub do repositório para localizar apps e pacotes relacionados.
