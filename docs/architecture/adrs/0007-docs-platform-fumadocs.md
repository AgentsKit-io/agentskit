# ADR 0007 — Documentation platform: Fumadocs

- **Status**: Accepted
- **Date**: 2026-04-14
- **Supersedes**: —
- **Related issues**: #238

## Context

The `apps/docs` site is built on Docusaurus 3.9. It works, but the experience is generic: theme is a stock React + Webpack stack, build is slow, MDX support is fine but not exceptional, search requires Algolia, and it currently fails to build on Node 25 (`mdxCrossCompilerCache` regression).

We evaluated alternatives in the brainstorm session (item #34-39): Nextra, Starlight (Astro), VitePress, Mintlify, Fumadocs. Two emerged as serious candidates for an ecosystem aimed at JS/TS developers using React/Next:

- **Nextra** — mature, Vercel-aligned, simple
- **Fumadocs** — newer, opinionated, modern (Next.js 16 + Tailwind v4 + RSC streaming)

A spike was built (`apps/docs-next`) to validate Fumadocs end-to-end. It ports the entire current Docusaurus content tree (44 pages across 12 sections) and produces a working static build.

## Decision

**AgentsKit documentation moves to Fumadocs.** The legacy `apps/docs` Docusaurus site is preserved during transition under `pnpm docs:legacy` but is no longer the canonical source.

Stack:

- Next.js 16 (app router, Turbopack)
- Fumadocs UI 16.7 + Fumadocs MDX 14.2 + Fumadocs Core 16.7
- Tailwind v4 with `fumadocs-ui/css/preset.css` (neutral theme)
- React 19, TypeScript 5.5+
- Built-in search (`createFromSource`) — no Algolia
- Deploy target: Vercel at `docs.agentskit.io` (subdomain decided in #235)

## Rationale

Why Fumadocs over the alternatives, in order of weight:

1. **Visual polish out-of-the-box** — Fumadocs ships with a modern, opinionated theme (the "Vercel docs feel"). Docusaurus and Nextra both require significant custom CSS to look distinctive.
2. **Native Next.js + Tailwind v4** — matches the ecosystem AgentsKit's audience already uses. Customizing pages is "write a React component," not "fight a theme."
3. **Built-in search via `createFromSource`** — no Algolia paid pipeline, no docsearch application form, no scraper config. Ship docs, get search.
4. **MDX server components + streaming** — page renders progressively. Better UX on slow networks, better Core Web Vitals.
5. **Build speed** — Turbopack + RSC means cold builds in seconds, not minutes. Matters as content grows to 200+ pages.
6. **Node 25 compatibility today** — Docusaurus is broken on `main`; Fumadocs builds clean.
7. **Path to AgentsKit-in-the-docs** — Fumadocs's component model makes embedding `useChat` (a docs assistant agent) trivial. This is the dogfooding moment we want.

Why not the alternatives:

- **Nextra**: very capable, but the visual baseline is closer to Docusaurus than to Fumadocs. We'd spend the saved time customizing.
- **Starlight (Astro)**: excellent SSG, but pulling in Astro means an island architecture our team isn't using elsewhere. Not worth the cognitive cost.
- **VitePress**: Vue-ecosystem credibility, but our audience writes React. Mixing frameworks in the docs build is friction without payoff.
- **Mintlify**: gorgeous, but SaaS lock-in. AgentsKit is a Manifesto-driven OSS project; outsourcing the docs platform contradicts principle 4 (zero lock-in) and principle 10 (open by default).

## Stability tier

- **Tier**: `stable` for the core Fumadocs choice
- This decision is reversible (it's documentation tooling, not a contract), but the cost of switching again is real. The next ADR change here would only happen if Fumadocs is abandoned or undergoes a hostile direction change.

## Consequences

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

## Migration scope (this ADR)

What this ADR commits to:

1. ✅ `apps/docs-next` Fumadocs scaffold with all 56 routes building cleanly
2. ✅ Root `pnpm docs` now points to Fumadocs; `pnpm docs:legacy` keeps the old site reachable
3. ✅ All 12 sections from Docusaurus ported (adapters, agents, chat-uis, components, contributing, data-layer, examples, getting-started, hooks, infrastructure, packages, theming)
4. ✅ Concepts section authored fresh (mental-model + 6 stub pages → ADRs)

What lands in follow-up PRs (tracked in #211):

- Visual identity pass (logo, favicon, OG image, custom Tailwind tokens)
- Domain wiring at `docs.agentskit.io` (depends on #235 DNS setup)
- i18n strategy decision and execution
- Recipes section (#229)
- Migration guides — Vercel AI SDK and LangChain (#241, #242)
- Embedded docs assistant (RAG over docs, dogfooding)
- TypeDoc API reference integration
- Archive `apps/docs` once `apps/docs-next` is at full parity and traffic is moved

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Stay on Docusaurus | Zero migration | Slow, generic, broken on Node 25, no path to docs assistant | Rejected |
| Nextra | Mature, Vercel-aligned | Generic baseline like Docusaurus | Rejected |
| Starlight (Astro) | Excellent SSG | Astro = new framework for the team | Rejected |
| VitePress | Fast, credible | Vue-ecosystem mismatch | Rejected |
| Mintlify | Gorgeous, AI-native | SaaS lock-in, contradicts Manifesto | Rejected |
| **Fumadocs** | Modern, Next-native, built-in search, fast, dogfood-friendly | i18n DIY, fresh learning curve | **Accepted** |

## Open questions (follow-up)

- **i18n strategy**: Crowdin pipeline vs LLM-assisted vs freeze. Decision in a separate RFC.
- **Visual identity tokens**: when the brand pass lands (logo, palette), wire them into the Tailwind config and Fumadocs theme.
- **Versioning**: Fumadocs supports versioned docs natively; configure when v1.0.0 of `@agentskit/core` is on the horizon.
- **Embedded docs chat**: which model, which RAG store, which UX. Designed once the substrate is stable.

## References

- Spike: PR #277, branch `foundation/fumadocs-spike`
- Migration commit: this PR
- Manifesto principles 4 (zero lock-in), 6 (docs are product), 10 (open by default)
- Phase 0 PRD #211 — story #238
