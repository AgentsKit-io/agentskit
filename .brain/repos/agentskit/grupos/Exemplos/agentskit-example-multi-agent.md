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
  - "apps/example-multi-agent/package.json"
  - "apps/example-multi-agent/src/App.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-multi-agent

> [!tldr] Em linguagem comum
> App React de exemplo com um chat que usa a skill `planner` de `@agentskit/skills` para orquestrar o trabalho.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

App React de exemplo. O componente `App` (`apps/example-multi-agent/src/App.tsx:70`) usa `useChat({` (`:71`) do [[agentskit-react]] e importa a skill `planner` de `@agentskit/skills` (`apps/example-multi-agent/src/App.tsx:3`). O exemplo não tem README próprio. O pacote é privado (`apps/example-multi-agent/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `App` (`apps/example-multi-agent/src/App.tsx:70`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/react` (`apps/example-multi-agent/package.json:12`) e `@agentskit/skills` (`:13`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

Nenhuma variável de ambiente lida em `apps/example-multi-agent/src`. O exemplo não grava dados próprios.

## Como mexer (para agentes)

- **Comece por:** `apps/example-multi-agent/src/App.tsx`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-multi-agent lint` (`tsc --noEmit`, `apps/example-multi-agent/package.json:9`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `vite` (`apps/example-multi-agent/package.json:7`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-multi-agent`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `289d3ae8 chore(deps): bump minor/patch dependencies across the workspace (#1004)`.

> [!info]- Detalhe técnico
> - `apps/example-multi-agent/package.json:1` — manifesto, scripts (`:7` dev, `:8` build, `:9` lint) e dependências (`:12-13`).
> - `apps/example-multi-agent/src/App.tsx:70` — `App`; `:71` — `useChat`.
