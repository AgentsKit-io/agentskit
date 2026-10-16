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
  - "apps/example-react/package.json"
  - "apps/example-react/src/App.tsx"
tags: [app, repo/agentskit, camada/ferramenta, grupo/exemplos]
---

# agentskit-example-react

> [!tldr] Em linguagem comum
> Chat React com adapter, ferramenta e memória no navegador (`localStorage`). Sem chave de OpenAI, roda em modo demo.

← [[00 Grupo - agentskit - Exemplos]]

## O que faz e por que existe

Mostra um chat React com o adapter OpenAI, uma ferramenta e memória local. A memória é `createLocalStorageMemory('agentskit-example-react')` (`apps/example-react/src/App.tsx:85`). O componente `App` é o default export de `apps/example-react/src/App.tsx:89`. Com `VITE_OPENAI_API_KEY` definida, o adapter é o OpenAI; sem ela, o adapter de demonstração (`apps/example-react/src/App.tsx:75-81`). O pacote é privado (`apps/example-react/package.json:2`). O exemplo não tem README próprio.

## API e contratos

Não exporta API npm. Símbolo principal: `App` (`apps/example-react/src/App.tsx:89`).

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências | `@agentskit/adapters` (`apps/example-react/package.json:12`), `@agentskit/core` (`:13`) e `@agentskit/react` (`:14`) |
| Consumidores | Nenhum; é um exemplo. |

## Dados e efeitos

- `VITE_OPENAI_API_KEY` (`apps/example-react/src/App.tsx:77`) seleciona o adapter real. Variáveis `VITE_` são embutidas no bundle do navegador; não coloque segredo de servidor nelas.
- `localStorage`: memória do chat sob a chave `agentskit-example-react` (`apps/example-react/src/App.tsx:85`).

## Como mexer (para agentes)

- **Comece por:** `apps/example-react/src/App.tsx`.
- **Testes:** nenhum teste declarado no exemplo.
- **Validação:** `pnpm --filter @agentskit/example-react lint` (`tsc --noEmit`, `apps/example-react/package.json:9`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Execução:** `dev` roda `vite` (`apps/example-react/package.json:7`).
- **Invariante:** mantenha a distinção entre o modo demo (sem chave) e a integração real (com `VITE_OPENAI_API_KEY`).
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o exemplo.

## Decisões e história

- ADR específico do exemplo: não identificado. Para os contratos exercitados, ver [[agentskit-react]] e [[agentskit-core]].
- Histórico recente (`git log --oneline -n 3 -- apps/example-react`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `230dd913 chore(deps): consolidated minor/patch dependabot updates (#916)`.

> [!info]- Detalhe técnico
> - `apps/example-react/package.json:1` — manifesto, scripts (`:7` dev, `:8` build, `:9` lint) e dependências (`:12-14`).
> - `apps/example-react/src/App.tsx:75-81` — escolha entre OpenAI e demo; `:77` — `VITE_OPENAI_API_KEY`; `:85` — memória em `localStorage`; `:89` — `App`.
