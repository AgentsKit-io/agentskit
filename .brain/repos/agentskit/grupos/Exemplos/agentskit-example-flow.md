---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9b31c771
metodo: "doc-bridge index versionado em .doc-bridge/index.json (gerado em 2026-10-12) para inventário/relacionamentos; pnpm indisponível, CLI não executada; inspeção estática no commit 9b31c771"
fontes:
  - "apps/example-flow/package.json"
  - "apps/example-flow/src/index.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-flow

> [!tldr] Em linguagem comum
> Demonstra fluxo YAML com etapas registradas para retomada.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra fluxo YAML com etapas registradas para retomada. [apps/example-flow/src/index.ts:33].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `registry` — FlowRegistry para executar etapas [apps/example-flow/src/index.ts:33]. Exemplo real: `const response = await fetch(url, options)` [apps/example-flow/src/index.ts:33].

## Quem usa e do que depende

Exercita [[agentskit-runtime]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-flow/package.json:1`.

## Dados e efeitos

Lê `flow.yaml`, chama GitHub, pode usar `GITHUB_TOKEN`, grava `.agentskit/flow.jsonl`; `RUN_ID` identifica execução.

## Como mexer (para agentes)

- Entrada: `apps/example-flow/src/index.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-flow lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-flow dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-flow/package.json`.
- Armadilha: JSONL é estado local da demonstração.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-flow): 2026-10-03 · 109488c8 · auditoria de dependências e engines; 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-flow/package.json:1`; implementação: `apps/example-flow/src/index.ts:33`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
