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
  - "apps/example-discord-bot/package.json"
  - "apps/example-discord-bot/README.md"
  - "apps/example-discord-bot/src/index.ts"
  - "apps/example-discord-bot/src/adapter.ts"
  - "apps/example-discord-bot/tests/adapter.test.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-discord-bot

> [!tldr] Em linguagem comum
> Bot de Discord de referência: recebe mensagens pelo `createChatTrigger` do runtime e responde com o agente.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Bot de Discord de referência, montado com `createChatTrigger` de `@agentskit/runtime` (`apps/example-discord-bot/README.md:3`). O runtime é criado em `apps/example-discord-bot/src/index.ts:18` e o gatilho em `:28`. O adapter do Discord é `discordAdapter` (`apps/example-discord-bot/src/adapter.ts:63`). O pacote é privado (`@agentskit/example-discord-bot`, `apps/example-discord-bot/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `discordAdapter(options)`, que devolve um `ChatSurfaceAdapter` (`apps/example-discord-bot/src/adapter.ts:63`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/core` e `@agentskit/runtime` (`apps/example-discord-bot/package.json:13-14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- `DISCORD_BOT_TOKEN` (`apps/example-discord-bot/src/index.ts:24`) e `DISCORD_PUBLIC_KEY` (`:25`) são lidos do ambiente, com padrão vazio. Os valores não são copiados para a documentação.
- `PORT` define a porta do servidor, com padrão `3001` (`apps/example-discord-bot/src/index.ts:74`).

## Como mexer (para agentes)

- **Comece por:** `apps/example-discord-bot/src/index.ts` e `apps/example-discord-bot/src/adapter.ts`.
- **Testes:** `apps/example-discord-bot/tests/adapter.test.ts`.
- **Validação:** `pnpm --filter @agentskit/example-discord-bot test` (`vitest run`, `apps/example-discord-bot/package.json:10`) e `pnpm --filter @agentskit/example-discord-bot lint` (`tsc --noEmit`, `:9`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução local:** `dev` roda `tsx src/index.ts` (`apps/example-discord-bot/package.json:7`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-discord-bot`, conferido em 2026-10-16): `109488c8 chore: audit dead deps and align Node engines (#1783)`, `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`.

> [!info]- Detalhe técnico
> - `apps/example-discord-bot/package.json:1` — manifesto, scripts (`:7` dev, `:9` lint, `:10` test) e dependências (`:13-14`).
> - `apps/example-discord-bot/src/index.ts:18` — `createRuntime`; `:28` — `createChatTrigger`.
> - `apps/example-discord-bot/src/adapter.ts:63` — `discordAdapter`.
