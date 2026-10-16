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
  - "packages/adapters/package.json"
  - "packages/adapters/CONVENTIONS.md"
  - "docs/architecture/adrs/0001-adapter-contract.md"
  - "package.json"
tags: [guia, repo/agentskit, camada/ferramenta]
---

# Adicionar um adapter de provedor

> [!tldr] Em linguagem comum
> Use ao implementar um provedor de modelo que satisfaça o contrato de adapter do AgentsKit.

← [[00 Hub - agentskit]]

## Quando usar

Ao implementar um provedor novo, ou corrigir um existente, dentro de `packages/adapters` (`@agentskit/adapters`, `packages/adapters/package.json:2`).

## Pré-requisitos

- Node.js 22+ e pnpm 10+ (`CONTRIBUTING.md:26-27`). O repo fixa `pnpm@10.34.4` em `package.json:5`.
- Checkout atualizado; leia o handoff do pacote antes de editar.

## Passos

1. Leia o contexto do pacote: `pnpm exec ak-docs query package adapters --agent` (o comando é a forma de `AGENTS.md:67`) e `packages/adapters/CONVENTIONS.md`.
2. Revise o contrato em `docs/architecture/adrs/0001-adapter-contract.md`, incluindo modalidades e política de saída de rede.
3. Implemente no escopo de `packages/adapters`: normalize streaming, erros e cancelamento sem alterar o contrato do core.
4. Adicione testes unitários do adapter e atualize a documentação de uso.
5. Gere o changeset: `pnpm changeset` (`CONTRIBUTING.md:145`).

## Como validar

- `pnpm --filter @agentskit/adapters test` (executa `turbo run build` e `vitest run`, `packages/adapters/package.json:65`).
- `pnpm --filter @agentskit/adapters lint` (`tsc --noEmit` e `tsc --noEmit -p tsconfig.tests.json`, `packages/adapters/package.json:67`).
- `pnpm check:quality-gates` (`package.json:31`).

## Erros comuns

- Não coloque segredos em fixtures; use só nomes de variáveis de ambiente e provedores simulados.
- Mudança no contrato exige ADR e coordenação, não só uma alteração no adapter (ver [[agentskit ADR-0001 - Contrato de adapter]]).

## Notas relacionadas

- [[agentskit-adapters]] (pacote e grupo)
- [[agentskit-core]] (contrato de origem)
- [[agentskit ADR-0001 - Contrato de adapter]]
