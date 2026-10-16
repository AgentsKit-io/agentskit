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
  - "apps/example-dspy/package.json"
  - "apps/example-dspy/README.md"
  - "apps/example-dspy/src/agent.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-dspy

> [!tldr] Em linguagem comum
> Vitrine que compara um prompt base com um prompt otimizado por DSPy, pontuando os dois lado a lado no pipeline de avaliação do AgentsKit.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Demonstra a comparação entre o prompt base e o prompt otimizado por DSPy, com pontuação pelo pipeline de avaliação (`apps/example-dspy/README.md:3`). A variante do agente é montada por `makeAgent(variant)` (`apps/example-dspy/src/agent.ts:79`). O pacote é privado (`apps/example-dspy/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `makeAgent(variant: PromptVariant)` (`apps/example-dspy/src/agent.ts:79`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependência | `@agentskit/eval` (`apps/example-dspy/package.json:14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

Nenhuma variável de ambiente lida em `apps/example-dspy/src`. Não grava dados próprios.

## Como mexer (para agentes)

- **Comece por:** `apps/example-dspy/src/agent.ts`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-dspy lint` (`tsc --noEmit`, `apps/example-dspy/package.json:11`). `build` também é `tsc --noEmit` (`:10`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `start` roda `tsx src/index.ts` (`apps/example-dspy/package.json:8`); `dev` usa `tsx watch` (`:9`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-dspy`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `85710388 refactor: consolidate public package surface (#1231)`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`.

> [!info]- Detalhe técnico
> - `apps/example-dspy/package.json:1` — manifesto, scripts (`:8` start, `:9` dev, `:10` build, `:11` lint) e dependência (`:14`).
> - `apps/example-dspy/src/agent.ts:79` — `makeAgent`.
