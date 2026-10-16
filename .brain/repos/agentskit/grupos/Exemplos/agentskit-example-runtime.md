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
  - "apps/example-runtime/package.json"
  - "apps/example-runtime/README.md"
  - "apps/example-runtime/src/index.ts"
  - "apps/example-runtime/src/durable.ts"
  - "apps/example-runtime/src/speculate.ts"
  - "apps/example-runtime/src/topology.ts"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-runtime

> [!tldr] Em linguagem comum
> Demos do runtime sem interface e sem chaves de provedor: o adapter é simulado, com uma sequência fixa de chamadas de ferramenta.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Demos headless do runtime, sem UI e sem chave de provedor; cada adapter é simulado (`apps/example-runtime/README.md:3`). O `src/index.ts` cria um adapter de demonstração com sequência fixa (`createDemoAdapter`, `apps/example-runtime/src/index.ts:6`), uma ferramenta `web_search` que devolve texto fixo (`:38`) e um observador que escreve no stderr (`:51`). O runtime é criado em `apps/example-runtime/src/index.ts:61`. Os outros arquivos do `src/` são `durable.ts`, `speculate.ts` e `topology.ts`. O pacote é privado (`apps/example-runtime/package.json:2`).

## API e contratos

Não exporta API npm. Símbolos principais: `createDemoAdapter` (`apps/example-runtime/src/index.ts:6`) e a chamada `createRuntime({ adapter, tools: [webSearch], observers: [verbose] })` (`:61`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/core` (`apps/example-runtime/package.json:15`), `@agentskit/runtime` (`:16`) e `@agentskit/skills` (`:17`) |
| Import | `researcher` de `@agentskit/skills` (`apps/example-runtime/src/index.ts:2`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

Nenhuma variável de ambiente lida em `apps/example-runtime/src`. Não há rede nem gravação: a ferramenta `web_search` devolve texto fixo (`apps/example-runtime/src/index.ts:47`), e o observador escreve no stderr.

## Como mexer (para agentes)

- **Comece por:** `apps/example-runtime/src/index.ts`; os demais arquivos de `src/` mostram durabilidade, especulação e topologia.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-runtime lint` (`tsc --noEmit`, `apps/example-runtime/package.json:12`). `build` também é `tsc --noEmit` (`:11`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `tsx src/index.ts` (`apps/example-runtime/package.json:7`).
- **Armadilha:** o adapter é simulado; não trate as respostas como saída de modelo real.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado. Para o contrato de runtime, ver [[agentskit-runtime]].
- Histórico recente (`git log --oneline -n 3 -- apps/example-runtime`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `289d3ae8 chore(deps): bump minor/patch dependencies across the workspace (#1004)`.

> [!info]- Detalhe técnico
> - `apps/example-runtime/package.json:1` — manifesto, scripts (`:7` dev, `:11` build, `:12` lint) e dependências (`:15-17`).
> - `apps/example-runtime/src/index.ts:6` — adapter simulado; `:38` — `webSearch`; `:61` — `createRuntime`.
