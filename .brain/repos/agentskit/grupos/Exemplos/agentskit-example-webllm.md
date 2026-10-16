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
  - "apps/example-webllm/package.json"
  - "apps/example-webllm/README.md"
  - "apps/example-webllm/src/App.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-webllm

> [!tldr] Em linguagem comum
> Chat que roda 100% no navegador: o modelo executa localmente via WebGPU, sem chamada a servidor.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Chat só de navegador: o LLM roda inteiramente no navegador por WebGPU (`apps/example-webllm/README.md:3`). O componente `App` é exportado em `apps/example-webllm/src/App.tsx:15` e usa `useChat({ adapter, memory })` (`:33`). O pacote é privado (`apps/example-webllm/package.json:2`).

## API e contratos

Não exporta API npm. Símbolo principal: `App` (`apps/example-webllm/src/App.tsx:15`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/adapters` (`apps/example-webllm/package.json:13`), `@agentskit/core` (`:14`) e `@agentskit/react` (`:15`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

Nenhuma variável de ambiente lida em `apps/example-webllm/src`. O modelo é baixado e executado no navegador; nenhuma chamada a provedor remoto é feita pelo exemplo. A memória é passada a `useChat` (`apps/example-webllm/src/App.tsx:33`).

## Como mexer (para agentes)

- **Comece por:** `apps/example-webllm/src/App.tsx`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-webllm lint` (`tsc --noEmit`, `apps/example-webllm/package.json:9`). `build` roda `tsc --noEmit && vite build` (`:8`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `vite` (`apps/example-webllm/package.json:7`). O navegador precisa de suporte a WebGPU.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado.
- Histórico recente (`git log --oneline -n 3 -- apps/example-webllm`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `230dd913 chore(deps): consolidated minor/patch dependabot updates (#916)`.

> [!info]- Detalhe técnico
> - `apps/example-webllm/package.json:1` — manifesto, scripts (`:7` dev, `:8` build, `:9` lint) e dependências (`:13-15`).
> - `apps/example-webllm/src/App.tsx:15` — `App`; `:33` — `useChat`.
