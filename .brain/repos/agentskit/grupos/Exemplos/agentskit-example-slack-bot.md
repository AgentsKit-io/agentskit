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
  - "apps/example-slack-bot/package.json"
  - "apps/example-slack-bot/src/adapter.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-slack-bot

> [!tldr] Em linguagem comum
> Demonstra adapter Slack com verificação de assinatura e resposta do runtime.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Este exemplo ensina: Demonstra adapter Slack com verificação de assinatura e resposta do runtime. [apps/example-slack-bot/src/adapter.ts:66].

## API e contratos

É app privado, não API npm. O símbolo demonstrado é `slackAdapter` — (options: SlackAdapterOptions): ChatSurfaceAdapter [apps/example-slack-bot/src/adapter.ts:66]. Exemplo real: `slackAdapter({ botToken, signingSecret })` [apps/example-slack-bot/src/adapter.ts:66].

## Quem usa e do que depende

Exercita [[agentskit-core]], [[agentskit-runtime]]; copie a composição adaptando configuração e host. Manifesto: `apps/example-slack-bot/package.json:1`.

## Dados e efeitos

HTTP de entrada e resposta via Slack; `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `PORT`.

## Como mexer (para agentes)

- Entrada: `apps/example-slack-bot/src/adapter.ts`.
- Invariante: preserve distinção entre fixture/mock e integração real.
- Testes: `apps/example-slack-bot/tests/adapter.test.ts`.
- Validação: `pnpm --filter @agentskit/example-slack-bot test`.
- Execução: Comando disponível conforme manifesto: `pnpm --filter @agentskit/example-slack-bot dev` se existir script `dev`; este manifesto define seu script em `apps/example-example-slack-bot/package.json`.
- Armadilha: Configure credenciais e validação antes de expor endpoint.
- Revisão: `.github/CODEOWNERS` ou mantenedores.

## Decisões e história

- Contratos: ADRs específicos do exemplo não confirmados; consulte o ADR do contrato exercitado antes de alterar sua semântica.
- Histórico recente (git log --oneline -15 -- apps/example-slack-bot): 2026-10-03 · 109488c8 · auditoria de dependências e engines; 2026-09-16 · 9266a6da · atualiza dependências; 2026-07-10 · a50084ee · polimento de dependências.

> [!info]- Detalhe técnico
> Manifesto: `apps/example-slack-bot/package.json:1`; implementação: `apps/example-slack-bot/src/adapter.ts:66`. O Doc Bridge index versionado foi consultado para contexto, sem atualização por indisponibilidade de pnpm.
