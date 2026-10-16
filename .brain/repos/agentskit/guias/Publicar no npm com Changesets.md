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
  - "CONTRIBUTING.md"
  - "package.json"
  - ".changeset/config.json"
  - ".github/workflows/release.yml"
tags: [guia, repo/agentskit]
---

# Publicar no npm com Changesets

> [!tldr] Em linguagem comum
> Use para preparar mudanças de versão e publicação de pacotes.

← [[00 Hub - agentskit]]

## Quando usar

Use para preparar mudanças de versão e publicação de pacotes.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md`).
- Checkout atualizado; leia instruções e handoff antes de editar pacote.

## Passos

- Confirme API pública, testes, docs e Changeset: `pnpm changeset`.
- Valide gates: `pnpm check:quality-gates`, `pnpm lint`, `pnpm build`, `pnpm test`.
- Rode pré-flight: `pnpm release:preflight`.
- O workflow de release consome mudanças aprovadas; inspecione `.github/workflows/release.yml` antes de qualquer operação de publicação.

## Como validar

`pnpm check:publication-surface`, `pnpm check:release-registry`, `pnpm check:packed-consumers`, `pnpm check:public-api-snapshot`.

## Erros comuns

Pacotes ignorados em `.changeset/config.json` não entram no fluxo normal de versionamento; apps privados não precisam changeset de publicação npm.

## Notas relacionadas

Consulte o hub do repositório para localizar apps e pacotes relacionados.
