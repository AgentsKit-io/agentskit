---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0007-docs-platform-fumadocs.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0007 - Documentation platform: Fumadocs

> [!tldr] Em linguagem comum
> Documentation platform: Fumadocs.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Accepted; - **Date**: 2026-04-14.

## Decisão em linguagem comum

**AgentsKit documentation moves to Fumadocs.** The legacy `apps/docs` Docusaurus site is preserved during transition under `pnpm docs:legacy` but is no longer the canonical source.

Stack:

- Next.js 16 (app router, Turbopack)
- Fumadocs UI 16.7 + Fumadocs MDX 14.2 + Fumadocs Core 16.7
- Tailwind v4 with `fumadocs-ui/css/preset.css` (neutral theme)
- React 19, TypeScript 5.5+
- Built-in search (`createFromSource`) — no Algolia
- Deploy target: Vercel at `docs.agentskit.io` (subdomain decided in #235)

## Contexto

The `apps/docs` site is built on Docusaurus 3.9. It works, but the experience is generic: theme is a stock React + Webpack stack, build is slow, MDX support is fine but not exceptional, search requires Algolia, and it currently fails to build on Node 25 (`mdxCrossCompilerCache` regression).

We evaluated alternatives in the brainstorm session (item #34-39): Nextra, Starlight (Astro), VitePress, Mintlify, Fumadocs. Two emerged as serious candidates for an ecosystem aimed at JS/TS developers using React/Next:

- **Nextra** — mature, Vercel-aligned, simple
- **Fumadocs** — newer, opinionated, modern (Next.js 16 + Tailwind v4 + RSC streaming)

A spike was built (`apps/docs-next`) to validate Fumadocs end-to-end. It ports the entire current Docusaurus content tree (44 pages across 12 sections) and produces a working static build.

## Consequências

### Positive
- Modern, opinionated docs out of the box — no design-by-committee
- Built-in search → one less SaaS dependency
- React/Next-native customization → AgentsKit components in docs are trivial
- Fast builds → good CI experience as content grows
- Clear path to a docs assistant (RAG over the docs themselves)

### Negative
- **i18n is not built-in**. Docusaurus had mature i18n with `apps/docs/i18n/{es,pt-BR,zh-Hans}` already populated. Fumadocs leaves the strategy to the consumer. **We freeze translated content during the migration** and decide the long-term strategy in a follow-up RFC (Crowdin, LLM-assisted, or freeze-until-EN-stabilizes).
- **One more Next.js app** in the monorepo — minor build-graph cost, mitigated by Turbopack caching.
- **The Docusaurus knowledge** the team built (theming, plugins) is not transferable. Fresh learning curve.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0007-docs-platform-fumadocs.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0007-docs-platform-fumadocs.md:1`
