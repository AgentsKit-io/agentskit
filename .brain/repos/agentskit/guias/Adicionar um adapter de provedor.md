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
  - "packages/adapters/CONVENTIONS.md"
  - "docs/architecture/adrs/0001-adapter-contract.md"
  - "package.json"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Adicionar um adapter de provedor

> [!tldr] Em linguagem comum
> Use ao implementar provedor que satisfaça o contrato Adapter.

← [[00 Hub - agentskit]]

## Quando usar

Use ao implementar provedor que satisfaça o contrato Adapter.

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md`).
- Checkout atualizado; leia instruções e handoff antes de editar pacote.

## Passos

- Consulte `pnpm exec ak-docs query package adapters --agent` e `packages/adapters/CONVENTIONS.md`.
- Revise `docs/architecture/adrs/0001-adapter-contract.md`, modalidades e policy egress.
- Implemente no escopo adapters, normalize streaming/erros/cancelamento sem alterar o contrato core.
- Adicione testes unitários com transportes stub e documentação de uso.
- Gere Changeset.

## Como validar

`pnpm --filter @agentskit/adapters test`, `pnpm --filter @agentskit/adapters lint`, `pnpm check:quality-gates`.

## Erros comuns

Não adicione segredo a fixtures; use apenas nomes de env vars e provedores simulados. Mudança no contrato exige ADR e coordenação, não só adapter.

## Notas relacionadas

Consulte o hub do repositório para localizar apps e pacotes relacionados.
