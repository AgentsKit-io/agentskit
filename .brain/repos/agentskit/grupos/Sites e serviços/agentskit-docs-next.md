---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "doc-bridge index versionado em .doc-bridge/index.json (generatedAt 2026-10-12) para inventário e relações; pnpm indisponível, CLI não executada; inspeção estática; auditado em 2026-10-16"
fontes:
  - "apps/docs-next/package.json"
  - "apps/docs-next/app/(home)/page.tsx"
  - "apps/docs-next/lib/analytics-client.ts"
  - "apps/docs-next/scripts/ping-indexnow.mjs"
  - ".github/workflows/indexnow.yml"
  - "apps/docs-next/tests"
  - "doc-bridge.config.json"
  - ".doc-bridge/index.json"
  - ".github/CODEOWNERS"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-docs-next

> [!tldr] Em linguagem comum
> Site canônico de documentação, referência e guias do AgentsKit. Também publica o corpus de documentação para agentes que o Doc Bridge consome.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

Aplicação Next.js que combina conteúdo Fumadocs, páginas geradas e a experiência Ask. A home é `HomePage` (`apps/docs-next/app/(home)/page.tsx:58`). O workspace é privado e não é pacote npm (`apps/docs-next/package.json:4`).

O `prebuild` roda geradores antes do build: API, changelog, performance, contexto do Ask, estatísticas e claims do ecossistema, sincronização de marca e conhecimento determinístico (`apps/docs-next/package.json:6`). O corpus de agentes vem do Doc Bridge (`doc-bridge.config.json`; `.doc-bridge/index.json`).

## API e contratos

O workspace não publica API npm. A superfície observável é a página de entrada:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `HomePage` | componente de página (default export) | Página inicial do site. | `apps/docs-next/app/(home)/page.tsx:58` |

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Dependências internas declaradas | `@agentskit/cross-platform` (`apps/docs-next/package.json:38`), `@agentskit/eval` (`:39`), `@agentskit/observability` (`:42`), `@agentskit/react` (`:44`) |
| Consumidores | Nenhum `package.json` do monorepo declara `@agentskit/docs-next` (é privado). Consumo externo não verificado. |

## Dados e efeitos

- Lê MDX, manifestos e artefatos gerados no `prebuild` (`apps/docs-next/package.json:6`).
- Indexação: o script `apps/docs-next/scripts/ping-indexnow.mjs` lê `INDEXNOW_KEY` (linha 10) e recusa executar sem ela (linha 14). O workflow `.github/workflows/indexnow.yml` passa o segredo `INDEXNOW_KEY` ao script (linha 34).
- Analytics: `apps/docs-next/lib/analytics-client.ts` lê `NEXT_PUBLIC_POSTHOG_KEY` (linha 33) e `NEXT_PUBLIC_POSTHOG_PROXY_HOST` (linha 34), e envia eventos ao PostHog por beacon ou fetch (linhas 93-98). A rota `apps/docs-next/app/xk3.json/route.ts` encaminha esses eventos ao host do PostHog (linha 5).
- Os valores das variáveis nunca são copiados para a documentação.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/app/(home)/page.tsx` (home), `apps/docs-next/package.json` (scripts e `prebuild`) e `apps/docs-next/lib/analytics-client.ts` (analytics).
- **Testes:** `apps/docs-next/tests/` (por exemplo `documentation-contracts.test.ts`, `seo-surfaces.test.ts` e `legacy-redirects.test.ts`).
- **Validação:** `pnpm --filter @agentskit/docs-next test` (executa `vitest run`, `apps/docs-next/package.json:20`) e `pnpm --filter @agentskit/docs-next lint` (`node scripts/gen-ask-context.mjs && tsc --noEmit`, `apps/docs-next/package.json:19`). Também existe `lint:mdx` (`apps/docs-next/package.json:21`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilha:** os comandos de build e deploy configurados não comprovam o destino ativo; confirme no manifesto e no workflow.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o app, mantenedores.

## Decisões e história

- Decisões de shell compartilhado: [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]] (`docs/architecture/adrs/0029-shared-ecosystem-web-shell.md`). Não há ADR específico do app identificado nesta revisão.
- Histórico recente (`git log --oneline -n 3 -- apps/docs-next`, conferido em 2026-10-16): `779aa601 fix(docs): tolerate npm downloads rate limits (#1841)`, `c7f19deb Add public npm downloads dashboard (#1840)`, `4e645423 docs(docs-next): add Doc Bridge agent-first docs use case (#1836)`.

> [!info]- Detalhe técnico
> - `apps/docs-next/package.json:1` — manifesto, scripts (`:6` prebuild, `:19` lint, `:20` test) e dependências internas.
> - `apps/docs-next/app/(home)/page.tsx:58` — `HomePage`.
> - `apps/docs-next/scripts/ping-indexnow.mjs:10` — leitura de `INDEXNOW_KEY`.
> - `apps/docs-next/lib/analytics-client.ts:33-34` — variáveis de PostHog (nomes).
> - `.doc-bridge/index.json` — `generatedAt` 2026-10-12; contexto de documentação, não substitui a leitura do código.
