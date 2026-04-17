# @agentskit/docs-next

**Spike**: Fumadocs-based documentation site, evaluated as the replacement for the existing Docusaurus app at `apps/docs`.

Tracked by [#238](https://github.com/AgentsKit-io/agentskit/issues/238) in the Phase 0 roadmap.

## What's here

A minimal but real Fumadocs site demonstrating:

- Next.js 16 app router with Fumadocs UI 16.x and Fumadocs MDX 14.x
- Home page (`app/(home)/page.tsx`) with hero + 3-feature grid
- Docs shell (`app/docs/layout.tsx`) with Fumadocs sidebar and search
- Catch-all docs page renderer (`app/docs/[[...slug]]/page.tsx`)
- Search API (`app/api/search/route.ts`)
- Real content: `index`, `getting-started/quickstart`, `getting-started/installation`, `concepts/mental-model`, plus 6 concept stub pages

Tailwind v4 + `fumadocs-ui/css/preset.css` + neutral theme.

## Why parallel to `apps/docs`

Spike, not migration. The existing Docusaurus site keeps serving traffic at the current URL. Once this Fumadocs spike is approved, a follow-up PR migrates remaining content and the `apps/docs` directory is replaced.

## Run locally

```bash
pnpm install
pnpm --filter @agentskit/docs-next dev
# open http://localhost:3000
```

Build:

```bash
pnpm --filter @agentskit/docs-next build
pnpm --filter @agentskit/docs-next start
```

## Decision criteria for migration

Compare against `apps/docs` (Docusaurus):

| Criteria | Docusaurus | Fumadocs (this) |
| --- | --- | --- |
| Tech stack | React + custom build | Next.js 16 + Tailwind v4 |
| MDX rendering | OK | Excellent (server components, streaming) |
| Visual polish out-of-box | Generic | Modern, opinionated |
| Search | Algolia (paid for OSS via partner) | Built-in (Fumadocs `createFromSource`) |
| Customization | CSS hacks | Tailwind + React, native |
| Deploy target | Static (anywhere) | Vercel/Cloudflare Pages (Next.js-native) |
| i18n | Mature plugin | DIY (acceptable trade) |
| Build speed | Slow on big sites | Fast (Next.js + Turbopack) |
| Node 25 compat | Currently broken on `main` | Works |

## Next steps if approved

1. Port remaining sections from `apps/docs` (adapters, agents, chat-uis, components, data-layer, examples, hooks, infrastructure, packages, theming, contributing)
2. Decide i18n strategy (Crowdin? freeze pt-BR/es/zh-Hans until EN stabilizes?)
3. Set up `docs.agentskit.io` deployment on Vercel
4. Archive `apps/docs`
5. Add chat-with-docs (RAG over the docs themselves) — dogfooding moment

## Status

Not wired into root `pnpm dev` / `pnpm build` yet — install + run manually until the approach is approved. See PR description.
