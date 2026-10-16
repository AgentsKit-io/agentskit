---
tipo: guia
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; comandos conferidos em package.json, CONTRIBUTING.md e .changeset/config.json; nenhuma publicação executada; auditado em 2026-10-16"
fontes:
  - "CONTRIBUTING.md"
  - "package.json"
  - ".changeset/config.json"
  - ".github/workflows/release.yml"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Publicar no npm com Changesets

> [!tldr] Em linguagem comum
> Use para registrar uma mudança de versão com changeset e validar a publicação dos pacotes. A publicação em si é feita por mantenedores.

← [[00 Hub - agentskit]]

## Quando usar

Ao preparar uma mudança que deve virar nova versão de pacote publicado no npm.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md:26-27`).
- Checkout atualizado e acesso ao repo; a publicação exige acesso ao npm (`CONTRIBUTING.md:242`).

## Passos

1. Gere o changeset e confirme API pública, testes e documentação: `pnpm changeset` (`CONTRIBUTING.md:145`).
2. Valide os gates: `pnpm check:quality-gates`, `pnpm lint`, `pnpm build` e `pnpm test` (`package.json:31`, `:27`, `:7`, `:8`).
3. Rode o pré-flight de publicação: `pnpm release:preflight` (`package.json:52`), que chama as verificações de superfície pública, registro, consumidores empacotados e snapshot da API.
4. Antes de qualquer operação de publicação, leia `.github/workflows/release.yml`.
5. Publicar (`pnpm changeset publish`) é para mantenedores com acesso ao npm (`CONTRIBUTING.md:242`).

## Como validar

- `pnpm check:publication-surface` (`package.json:55`)
- `pnpm check:release-registry` (`package.json:53`)
- `pnpm check:packed-consumers` (`package.json:56`)
- `pnpm check:public-api-snapshot` (`package.json:60`)

## Erros comuns

- Pacotes listados em `ignore` de `.changeset/config.json` (`:10`) ficam fora do fluxo normal de versionamento.
- O pacote é publicado com `access: public` (`.changeset/config.json:7`).

## Notas relacionadas

- [[Criar um pacote]]
- [[Rodar a documentação]]
- [[agentskit-core]]
