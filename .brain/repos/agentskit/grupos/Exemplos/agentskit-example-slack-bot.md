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
  - "apps/example-slack-bot/package.json"
  - "apps/example-slack-bot/README.md"
  - "apps/example-slack-bot/src/index.ts"
  - "apps/example-slack-bot/src/adapter.ts"
  - "apps/example-slack-bot/tests/adapter.test.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-slack-bot

> [!tldr] Em linguagem comum
> Bot de Slack de referência: recebe mensagens pelo `createChatTrigger` do runtime e responde com o agente.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Bot de Slack de referência, montado com `createChatTrigger` de `@agentskit/runtime` (`apps/example-slack-bot/README.md:3`). O runtime é criado em `apps/example-slack-bot/src/index.ts:23` e o gatilho em `:33`. O adapter do Slack é `slackAdapter` (`apps/example-slack-bot/src/adapter.ts:66`). O pacote é privado (`apps/example-slack-bot/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `slackAdapter(options)`, que devolve um `ChatSurfaceAdapter` (`apps/example-slack-bot/src/adapter.ts:66`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/core` e `@agentskit/runtime` (`apps/example-slack-bot/package.json:13-14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- `SLACK_BOT_TOKEN` (`apps/example-slack-bot/src/index.ts:29`) e `SLACK_SIGNING_SECRET` (`:30`) são lidos do ambiente, com padrão vazio. O segundo valida a assinatura das requisições do Slack. Os valores não são copiados para a documentação.
- `PORT` define a porta, com padrão `3000` (`apps/example-slack-bot/src/index.ts:82`).

## Como mexer (para agentes)

- **Comece por:** `apps/example-slack-bot/src/index.ts` e `apps/example-slack-bot/src/adapter.ts`.
- **Testes:** `apps/example-slack-bot/tests/adapter.test.ts`.
- **Validação:** `pnpm --filter @agentskit/example-slack-bot test` (`vitest run`, `apps/example-slack-bot/package.json:10`) e `pnpm --filter @agentskit/example-slack-bot lint` (`tsc --noEmit`, `:9`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução local:** `dev` roda `tsx src/index.ts` (`apps/example-slack-bot/package.json:7`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-slack-bot`, conferido em 2026-10-16): `109488c8 chore: audit dead deps and align Node engines (#1783)`, `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`.

> [!info]- Detalhe técnico
> - `apps/example-slack-bot/package.json:1` — manifesto, scripts (`:7` dev, `:9` lint, `:10` test) e dependências (`:13-14`).
> - `apps/example-slack-bot/src/index.ts:23` — `createRuntime`; `:33` — `createChatTrigger`.
> - `apps/example-slack-bot/src/adapter.ts:66` — `slackAdapter`.
