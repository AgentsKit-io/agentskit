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
  - "apps/example-teams-bot/package.json"
  - "apps/example-teams-bot/src/adapter.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-teams-bot

> [!tldr] Em linguagem comum
> Demonstra adapter Teams com cliente de serviço injetado e runtime.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra adapter Teams com cliente de serviço injetado e runtime. [apps/example-teams-bot/src/adapter.ts:60].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `teamsAdapter` — (options: TeamsAdapterOptions): ChatSurfaceAdapter [apps/example-teams-bot/src/adapter.ts:60]. Exemplo real: `teamsAdapter({ serviceClient, verifyToken })` [apps/example-teams-bot/src/adapter.ts:60].

## Quem usa e do que depende

Exercita [[agentskit-core]], [[agentskit-runtime]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-teams-bot/package.json:1`.

## Dados e efeitos

HTTP de atividades; envio pelo client injetado; `TEAMS_APP_ID`, `TEAMS_APP_SECRET`, `TEAMS_DISABLE_AUTH`, `PORT`.

## Como mexer (para agentes)

- Entrada: `apps/example-teams-bot/src/adapter.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: `apps/example-teams-bot/tests/adapter.test.ts`.
- Validação: `pnpm --filter @agentskit/example-teams-bot test`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-teams-bot dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-teams-bot/package.json`.
- Armadilha: Verificação padrão falha fechada; não desabilite autenticação em endpoint público.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-teams-bot): 2026-10-03 · 109488c8 · auditoria de dependências e engines; 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-teams-bot/package.json:1`; implementação: `apps/example-teams-bot/src/adapter.ts:60`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
