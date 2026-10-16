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
  - "apps/example-runtime/package.json"
  - "apps/example-runtime/src/index.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-runtime

> [!tldr] Em linguagem comum
> Demonstra runtime, observer, ferramenta, durable runner, especulação e topologias.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra runtime, observer, ferramenta, durable runner, especulação e topologias. [apps/example-runtime/src/index.ts:63].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `runtime.run` — (task: string, options?) => Promise<RunResult> [apps/example-runtime/src/index.ts:63]. Exemplo real: `await runtime.run('Research the latest developments in AI safety')` [apps/example-runtime/src/index.ts:63].

## Quem usa e do que depende

Exercita [[agentskit-runtime]], [[agentskit-core]], [[agentskit-skills]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-runtime/package.json:1`.

## Dados e efeitos

Cenário principal usa adapter sintético; `durable.ts` grava `.agentskit/durable.jsonl`; outros cenários usam stubs.

## Como mexer (para agentes)

- Entrada: `apps/example-runtime/src/index.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-runtime lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-runtime dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-runtime/package.json`.
- Armadilha: Topologias usam agentes mock.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-runtime): 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências; 2026-06-15 · 289d3ae8 · atualiza dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-runtime/package.json:1`; implementação: `apps/example-runtime/src/index.ts:63`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
