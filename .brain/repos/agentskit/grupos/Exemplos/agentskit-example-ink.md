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
  - "apps/example-ink/package.json"
  - "apps/example-ink/src/index.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-ink

> [!tldr] Em linguagem comum
> Chat no terminal com Ink: a interface de linha de comando usa `useChat` do `@agentskit/ink` e memória do pacote de memória.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Interface de chat no terminal, feita com Ink (React para terminal). O estado vem de `useChat({` (`apps/example-ink/src/index.tsx:53`). O exemplo não tem README próprio. O pacote é privado (`apps/example-ink/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: a chamada `useChat({ ... })` em `apps/example-ink/src/index.tsx:53`, do pacote [[agentskit-ink]].

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/core` (`apps/example-ink/package.json:12`), [[agentskit-ink]] (`:13`) e `@agentskit/memory` (`:14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

Nenhuma variável de ambiente lida em `apps/example-ink/src`. A memória do chat é `fileChatMemory` de `@agentskit/memory` (`apps/example-ink/src/index.tsx:4`), ou seja, o histórico é gravado em arquivo local.

## Como mexer (para agentes)

- **Comece por:** `apps/example-ink/src/index.tsx`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-ink lint` (`tsc --noEmit`, `apps/example-ink/package.json:9`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `tsx src/index.tsx` (`apps/example-ink/package.json:7`).
- **Armadilha:** teclado e terminal dependem do Ink; testes de teclado seguem a regra de [[agentskit-ink]].
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-ink`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `289d3ae8 chore(deps): bump minor/patch dependencies across the workspace (#1004)`.

> [!info]- Detalhe técnico
> - `apps/example-ink/package.json:1` — manifesto, scripts (`:7` dev, `:8` build, `:9` lint) e dependências (`:12-14`).
> - `apps/example-ink/src/index.tsx:53` — `useChat`.
