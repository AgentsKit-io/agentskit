# docs-next

Profile: <code>public-app</code>

## Verified proof

- App package lives at `apps/docs-next`.
- Root claims: [ecosystem-claims.json](../../ecosystem-claims.json)

## Install / run

<!-- readme-command:install -->
```bash
pnpm --filter ./apps/docs-next build
```

## Quick start

<!-- readme-example:quickstart -->
```bash
pnpm --filter ./apps/docs-next build
```

## Maturity and compatibility

- Private monorepo app surface; ships with AgentsKit docs/product properties.
- **Node.js 20+** and **TypeScript**

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) and [LICENSE](../../LICENSE).

## Ecosystem

- [AgentsKit](https://www.agentskit.io)
- [Registry](https://registry.agentskit.io)
- [Playbook](https://playbook.agentskit.io)
- [AKOS](https://akos.agentskit.io)

**Tags:** `agentskit` · `typescript`

# @agentskit/docs-next

Profile: <code>public-app</code>

Canonical Fumadocs-based documentation site for the AgentsKit package contracts,
usage guides, recipes, integrations, and ecosystem hubs. The legacy Docusaurus
app at `apps/docs` is being retired; keep new public documentation here.

## What's here

The app provides:

- Next.js 16 app router with Fumadocs UI 16.x and Fumadocs MDX 14.x
- Home, ecosystem, integrations, recipes, publications, and resources hubs
- Docs shell (`app/docs/layout.tsx`) with Fumadocs sidebar and search
- Catch-all docs page renderer (`app/docs/[[...slug]]/page.tsx`)
- Search API (`app/api/search/route.ts`) plus `llms.txt`, sitemap, canonical metadata, and JSON-LD
- 400+ maintained MDX pages, including package guides, for-agents handoffs, recipes, and provider/integration references

Tailwind v4 + `fumadocs-ui/css/preset.css` + neutral theme.

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

## Maintainer checks

- `pnpm --filter @agentskit/docs-next lint:mdx` validates the MDX surface.
- `pnpm --filter @agentskit/docs-next check:links` validates internal references.
- `pnpm docs:build` runs the production build from the repository root.
- Keep package READMEs, `/docs/reference/packages`, and `/docs/for-agents` aligned when an API changes.

## Status

The app is maintained as the canonical docs surface and is available through the
root `pnpm docs` / `pnpm docs:build` scripts. Deployment remains an explicit
release action; local documentation changes do not publish automatically.
