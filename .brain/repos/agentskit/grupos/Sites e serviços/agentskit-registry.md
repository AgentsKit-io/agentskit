---
tipo: app
repo: agentskit
grupo: Sites e serviços
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; doc-bridge index versionado em .doc-bridge/index.json para inventário; pnpm indisponível, CLI não executada; auditado em 2026-10-16"
fontes:
  - "apps/registry/package.json"
  - "apps/registry/app/(home)/page.tsx"
  - "apps/registry/components/ask-widget.tsx"
  - "apps/registry/lib/catalog.ts"
  - "apps/registry/lib/registry.ts"
  - "apps/registry/lib/posthog-client.ts"
  - "apps/registry/lib/analytics.ts"
  - ".github/CODEOWNERS"
tags: [app, repo/agentskit, camada/ferramenta, grupo/sites-e-servicos]
---

# agentskit-registry

> [!tldr] Em linguagem comum
> Catálogo visual para descobrir agentes prontos, ver categorias e copiar comandos de instalação. Inclui um widget de pergunta ao Ask.

← [[00 Grupo - agentskit - Sites e serviços]]

## O que faz e por que existe

A home carrega itens e categorias; os filtros levam para `/agents` (`apps/registry/app/(home)/page.tsx:21`). A home é `HomePage`, função assíncrona que recebe `searchParams`. O workspace é privado e não é pacote npm (`apps/registry/package.json:4`; nome `@agentskit/registry-app` na linha 2).

## API e contratos

O workspace não publica API npm. A superfície observável é a página de entrada:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `HomePage` | página assíncrona (default export) | Home do catálogo, com filtros via `searchParams`. | `apps/registry/app/(home)/page.tsx:21` |

Uso real, a assinatura da própria página:

```tsx
export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
```

Fonte: `apps/registry/app/(home)/page.tsx:21`.

## Quem usa e do que depende

| Relação | Evidência |
|---|---|
| Ask | O widget `apps/registry/components/ask-widget.tsx` consulta o endpoint do Ask: `NEXT_PUBLIC_ASK_ENDPOINT` (linha 138), com valor padrão `https://ask.agentskit.io/v1/ask`. Ver [[agentskit-ask-backend]]. |
| Catálogo | `apps/registry/lib/catalog.ts` concentra filtro, ordenação e comparação (`filterAndSortAgents`, `parseCompareIds`, `:30`, `:51`). A fonte de conteúdo é o `loader` de `apps/registry/lib/source.ts:4`. |
| Consumidores | Visitantes do site. Nenhum `package.json` do monorepo declara `@agentskit/registry-app`. |

## Dados e efeitos

- Revalidação: a home exporta `revalidate = 3600` (`apps/registry/app/(home)/page.tsx:11`), o mesmo intervalo das páginas de lista e das rotas `llms.txt` (`apps/registry/app/llms.txt/route.ts:5`).
- Variável pública: `NEXT_PUBLIC_ASK_ENDPOINT` (`apps/registry/components/ask-widget.tsx:138`); é um endereço público, não um segredo.
- Analytics: `apps/registry/lib/posthog-client.ts` e `apps/registry/lib/analytics.ts` (contrato e envio; ver os arquivos para as variáveis usadas).

## Como mexer (para agentes)

- **Comece por:** `apps/registry/app/(home)/page.tsx` (home), `apps/registry/lib/catalog.ts` (carga do catálogo) e `apps/registry/components/ask-widget.tsx` (widget do Ask).
- **Testes:** `apps/registry/lib/*.test.ts` (catálogo, categorias, validação, analytics, clipboard, descoberta etc.) e `app/deterministic` (rotas determinísticas).
- **Validação:** `pnpm --filter @agentskit/registry-app test` (executa `vitest run lib app/deterministic`, `apps/registry/package.json:10`) e `pnpm --filter @agentskit/registry-app lint` (`tsc --noEmit`, `apps/registry/package.json:12`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilha:** os comandos de build e deploy configurados não comprovam o destino ativo; confirme no manifesto e no workflow.
- **Revisão:** owners em `.github/CODEOWNERS`; sem regra específica para o app, mantenedores.

## Decisões e história

- ADR relacionado: [[agentskit ADR-0033 - Registry adota o shell do ecossistema]] (`docs/architecture/adrs/0033-registry-ecosystem-shell.md`), quando a alteração tocar a decisão descrita; não implica que o ADR cubra toda a implementação.
- Histórico recente (`git log --oneline -n 3 -- apps/registry`, conferido em 2026-10-16): `c7f19deb Add public npm downloads dashboard (#1840)`, `e710dafa build(sites): docs-next and registry on Cloudflare Workers via vinext (#1738)`, `7c448e49 fix: route cli, adapters, tools, eval, sandbox via cross-platform (#1682)`.

> [!info]- Detalhe técnico
> - `apps/registry/package.json:1` — manifesto, scripts (`:9` build, `:10` test, `:12` lint).
> - `apps/registry/app/(home)/page.tsx:11` — `revalidate = 3600`; `:21` — `HomePage`.
> - `apps/registry/components/ask-widget.tsx:138` — endpoint do Ask.
