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
  - "pnpm-workspace.yaml"
  - "package.json"
  - ".github/workflows/e2e.yml"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Adicionar um exemplo

> [!tldr] Em linguagem comum
> Use para demonstrar composição com um host ou capacidade AgentsKit.

← [[00 Hub - agentskit]]

## Quando usar

Use para demonstrar composição com um host ou capacidade AgentsKit.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md`).
- Checkout atualizado; leia instruções e handoff antes de editar pacote.

## Passos

- Leia `AGENTS.md`, `CONTRIBUTING.md` e os README/CONVENTIONS dos pacotes usados.
- Crie `apps/example-<slug>` e adicione dependências `workspace:*` no manifesto.
- Inclua README com objetivo, requisitos, comandos `dev`, credenciais por nome e limites entre mock e integração real.
- Adicione testes se comportamento novo exigir; conecte no E2E só quando aplicável.

## Como validar

`pnpm --filter @agentskit/example-<slug> lint`, `pnpm --filter @agentskit/example-<slug> build`; se tiver testes, `pnpm --filter @agentskit/example-<slug> test`; confira `pnpm test:e2e`.

## Erros comuns

Não chame uma simulação de integração real; não inclua chaves em app cliente ou documentação.

## Notas relacionadas

Consulte o hub do repositório para localizar apps e pacotes relacionados.
