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
  - "apps/docs-next/package.json"
  - "doc-bridge.config.json"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Rodar a documentação

> [!tldr] Em linguagem comum
> Use para escrever ou validar conteúdo canônico e gerar referência.

← [[00 Hub - agentskit]]

## Quando usar

Use para escrever ou validar conteúdo canônico e gerar referência.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md`).
- Checkout atualizado; leia instruções e handoff antes de editar pacote.

## Passos

- Instale dependências: `pnpm install`.
- Consulte handoff: `pnpm exec ak-docs query package <id> --agent`.
- Rode site: `pnpm docs` (ou `pnpm --filter @agentskit/docs-next dev`).
- Crie página: `pnpm --filter @agentskit/docs-next exec node scripts/docs-new.mjs guide <slug>`.
- Para alterações no corpus, gere índice: `pnpm docs:bridge:index`.

## Como validar

`pnpm --filter @agentskit/docs-next lint`, `pnpm --filter @agentskit/docs-next test`, `pnpm docs:bridge:gate`, `pnpm docs:bridge:doctor`.

## Erros comuns

`pnpm docs:deploy` publica produção; só usar com autorização explícita e revisão, pois é efeito externo. O comando de build sozinho não comprova deploy.

## Notas relacionadas

Consulte o hub do repositório para localizar apps e pacotes relacionados.
