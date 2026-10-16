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
  - "apps/example-discord-bot/package.json"
  - "apps/example-discord-bot/src/adapter.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-discord-bot

> [!tldr] Em linguagem comum
> Demonstra a fronteira entre uma interação Discord e ChatSurface/runtime.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra a fronteira entre uma interação Discord e ChatSurface/runtime. [apps/example-discord-bot/src/adapter.ts:63].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `discordAdapter` — (options: DiscordAdapterOptions): ChatSurfaceAdapter [apps/example-discord-bot/src/adapter.ts:63]. Exemplo real: `discordAdapter({ botToken, publicKey })` [apps/example-discord-bot/src/adapter.ts:63].

## Quem usa e do que depende

Exercita [[agentskit-core]] e [[agentskit-runtime]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-discord-bot/package.json:1`.

## Dados e efeitos

Recebe HTTP, valida assinatura e pode responder via Discord API; `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `PORT`.

## Como mexer (para agentes)

- Entrada: `apps/example-discord-bot/src/adapter.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: `apps/example-discord-bot/tests/adapter.test.ts`.
- Validação: `pnpm --filter @agentskit/example-discord-bot test`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-discord-bot dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-discord-bot/package.json`.
- Armadilha: Integração real requer endpoint e credenciais configurados.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-discord-bot): 2026-10-03 · 109488c8 · auditoria de dependências e engines; 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-discord-bot/package.json:1`; implementação: `apps/example-discord-bot/src/adapter.ts:63`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
