---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; doc-bridge index versionado em .doc-bridge/index.json para inventário; pnpm indisponível, Playwright não executado; auditado em 2026-10-16"
fontes:
  - "apps/visual-react/package.json"
  - "apps/visual-react/src/Harness.tsx"
  - "apps/visual-react/tests/visual.spec.ts"
  - "apps/visual-react/tests/visual.spec.ts-snapshots"
  - ".github/CODEOWNERS"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-visual-react

> [!tldr] Em linguagem comum
> Galeria controlada para inspecionar componentes React em casos fixos e comparar capturas de tela. Serve para ver se a aparência dos componentes mudou sem querer.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Harness com casos fixos (`CASES`) que renderizam componentes de `@agentskit/react` em estados repetíveis (`apps/visual-react/src/Harness.tsx:132`). O componente `Harness` é exportado em `apps/visual-react/src/Harness.tsx:150`. Os testes de navegador (Playwright) navegam pela galeria e comparam capturas com as imagens de referência em `apps/visual-react/tests/visual.spec.ts-snapshots/`. O workspace é privado (`apps/visual-react/package.json:4`; nome `@agentskit/visual-react` na linha 2).

## API e contratos

O workspace não publica API npm. A superfície observável:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `Harness` | componente React | Galeria de casos fixos. | `apps/visual-react/src/Harness.tsx:150` |
| `CASE_IDS` | `string[]` | Identificadores dos casos da galeria. | `apps/visual-react/src/Harness.tsx:132` |

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependência interna | `@agentskit/react` (`apps/visual-react/package.json:17`), que é o alvo dos casos. Ver [[agentskit-react]]. |
| Consumidores | Nenhum `package.json` do monorepo declara `@agentskit/visual-react`. |

## Dados e efeitos

- Sem backend e sem persistência: os casos usam dados fixos definidos no próprio `Harness.tsx`.
- Atualização de capturas: `test:visual:update` roda o Playwright com `--update-snapshots` (`apps/visual-react/package.json:12`). Atualize só quando a mudança visual for intencional.

## Como mexer (para agentes)

- **Comece por:** `apps/visual-react/src/Harness.tsx` (casos) e `apps/visual-react/tests/visual.spec.ts` (testes de captura).
- **Testes:** `apps/visual-react/tests/visual.spec.ts`, com as capturas de referência em `tests/visual.spec.ts-snapshots/`.
- **Validação:** `pnpm --filter @agentskit/visual-react test:visual` (`playwright test`, `apps/visual-react/package.json:11`). O manifesto não tem script `test`. Para instalar o Chromium: `test:visual:install` (`apps/visual-react/package.json:13`). Não executados nesta auditoria: `pnpm` e o Playwright não estão disponíveis neste ambiente.
- **Lint:** `pnpm --filter @agentskit/visual-react lint` (`tsc --noEmit`, `apps/visual-react/package.json:9`).
- **Armadilha:** capturas são específicas da plataforma (o nome dos arquivos indica `chromium-linux`); regerar em outro sistema muda a referência.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o app, mantenedores.

## Decisões e história

- ADR relacionado pelo título: [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]] (`docs/architecture/adrs/0025-public-api-and-compatibility-gates.md`). Não verificado no corpo do ADR.
- Histórico recente (`git log --oneline -n 3 -- apps/visual-react`, conferido em 2026-10-16): `9266a6da chore(deps): refresh minor and patch versions`, `a50084ee chore: dependency polish, doc-bridge, and registry catalog UI (#1119)`, `289d3ae8 chore(deps): bump minor/patch dependencies across the workspace (#1004)`.

> [!info]- Detalhe técnico
> - `apps/visual-react/package.json:1` — manifesto, scripts (`:8-9` build/lint, `:11-13` visual).
> - `apps/visual-react/src/Harness.tsx:132` — `CASE_IDS`; `:150` — `Harness`.
> - `apps/visual-react/tests/visual.spec.ts` — testes de captura.
