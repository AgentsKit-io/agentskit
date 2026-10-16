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
  - "apps/example-flow/package.json"
  - "apps/example-flow/README.md"
  - "apps/example-flow/src/index.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-flow

> [!tldr] Em linguagem comum
> Demo ao vivo de `compileFlow` do runtime: um fluxo definido em YAML é compilado e executado.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Demo ao vivo de `compileFlow` de `@agentskit/runtime`, com um fluxo definido em YAML (`apps/example-flow/README.md:3`). A compilação acontece em `apps/example-flow/src/index.ts:89`, com a definição e um registro de passos. O pacote é privado (`apps/example-flow/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `compileFlow({ definition, registry })` (`apps/example-flow/src/index.ts:89`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependência | `@agentskit/runtime` (`apps/example-flow/package.json:12`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- `GITHUB_TOKEN` (`apps/example-flow/src/index.ts:41`): quando definido, é enviado como `authorization` em uma requisição de rede. O valor não é copiado para a documentação.
- `RUN_ID` (`apps/example-flow/src/index.ts:91`): identificador da execução, com padrão `demo-run`.
- Rede: a requisição de rede depende do passo do fluxo que a faz.

## Como mexer (para agentes)

- **Comece por:** `apps/example-flow/src/index.ts`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-flow lint` (`tsc --noEmit`, `apps/example-flow/package.json:9`). `build` também é `tsc --noEmit` (`:8`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `tsx src/index.ts` (`apps/example-flow/package.json:7`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-flow`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `230dd913 chore(deps): consolidated minor/patch dependabot updates (#916)`.

> [!info]- Detalhe técnico
> - `apps/example-flow/package.json:1` — manifesto, scripts (`:7` dev, `:8` build, `:9` lint) e dependência (`:12`).
> - `apps/example-flow/src/index.ts:89` — `compileFlow`.
> - `apps/example-flow/src/index.ts:41` — `GITHUB_TOKEN`; `:91` — `RUN_ID`.
