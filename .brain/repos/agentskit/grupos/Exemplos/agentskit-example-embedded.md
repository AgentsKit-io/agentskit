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
  - "apps/example-embedded/package.json"
  - "apps/example-embedded/src/index.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-embedded

> [!tldr] Em linguagem comum
> Mostra runtime via argumentos/stdio e encaixes de host editor.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Mostra runtime via argumentos/stdio e encaixes de host editor. [apps/example-embedded/src/index.ts:32].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `pickAdapter` — (): AdapterFactory [apps/example-embedded/src/index.ts:32]. Exemplo real: `const runtime = createRuntime({ adapter: pickAdapter() })` [apps/example-embedded/src/index.ts:32].

## Quem usa e do que depende

Exercita [[agentskit-core]], [[agentskit-adapters]], [[agentskit-runtime]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-embedded/package.json:1`.

## Dados e efeitos

Lê stdin/argumentos e pode chamar provedor remoto; `OPENAI_API_KEY`, `OPENAI_MODEL`; sem banco próprio.

## Como mexer (para agentes)

- Entrada: `apps/example-embedded/src/index.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: nenhum teste declarado.
- Validação: `pnpm --filter @agentskit/example-embedded lint`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-embedded dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-embedded/package.json`.
- Armadilha: Raycast é auxiliar aninhado, não workspace pnpm independente.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-embedded): 2026-09-16 · 9266a6da · atualiza dependências; 2026-08-19 · 5cb1c6df · instrumenta ativação da documentação e endurece superfícies públicas; 2026-07-10 · a50084ee · polimento de dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-embedded/package.json:1`; implementação: `apps/example-embedded/src/index.ts:32`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
