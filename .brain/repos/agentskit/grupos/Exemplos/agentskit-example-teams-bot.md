---
tipo: app
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; pnpm indisponível, comandos não executados; auditado em 2026-10-16"
fontes:
  - "apps/example-teams-bot/package.json"
  - "apps/example-teams-bot/README.md"
  - "apps/example-teams-bot/src/index.ts"
  - "apps/example-teams-bot/src/adapter.ts"
  - "apps/example-teams-bot/tests/adapter.test.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-teams-bot

> [!tldr] Em linguagem comum
> Bot de Microsoft Teams de referência: recebe mensagens pelo `createChatTrigger` do runtime e responde com o agente.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Bot de Microsoft Teams de referência, montado com `createChatTrigger` de `@agentskit/runtime` (`apps/example-teams-bot/README.md:3`). O runtime é criado em `apps/example-teams-bot/src/index.ts:18` e o gatilho em `:41`. O adapter do Teams é `teamsAdapter` (`apps/example-teams-bot/src/adapter.ts:60`). O pacote é privado (`apps/example-teams-bot/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `teamsAdapter(options)`, que devolve um `ChatSurfaceAdapter` (`apps/example-teams-bot/src/adapter.ts:60`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/core` e `@agentskit/runtime` (`apps/example-teams-bot/package.json:13-14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- `TEAMS_DISABLE_AUTH`: quando vale `1`, a verificação de autenticação é pulada (`apps/example-teams-bot/src/index.ts:34`). É um atalho de desenvolvimento; não deve estar ativo em um ambiente exposto.
- `PORT` define a porta, com padrão `3978` (`apps/example-teams-bot/src/index.ts:69`).

## Como mexer (para agentes)

- **Comece por:** `apps/example-teams-bot/src/index.ts` e `apps/example-teams-bot/src/adapter.ts`.
- **Testes:** `apps/example-teams-bot/tests/adapter.test.ts`.
- **Validação:** `pnpm --filter @agentskit/example-teams-bot test` (`vitest run`, `apps/example-teams-bot/package.json:10`) e `pnpm --filter @agentskit/example-teams-bot lint` (`tsc --noEmit`, `:9`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução local:** `dev` roda `tsx src/index.ts` (`apps/example-teams-bot/package.json:7`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-teams-bot`, conferido em 2026-10-16): `109488c8 chore: audit dead deps and align Node engines (#1783)`, `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`.

> [!info]- Detalhe técnico
> - `apps/example-teams-bot/package.json:1` — manifesto, scripts (`:7` dev, `:9` lint, `:10` test) e dependências (`:13-14`).
> - `apps/example-teams-bot/src/index.ts:18` — `createRuntime`; `:34` — `TEAMS_DISABLE_AUTH`; `:41` — `createChatTrigger`.
> - `apps/example-teams-bot/src/adapter.ts:60` — `teamsAdapter`.
