# @agentskit/landing

Standalone Next.js 16 landing page for AgentsKit — issue [#230](https://github.com/AgentsKit-io/agentskit/issues/230) (P0.19).

Independent from `apps/docs-next`. Eventual target: apex `agentskit.io` for landing, `docs.agentskit.io` (or `agentskit.io/docs`) for the Fumadocs site. Until that DNS migration ships, all `LINKS.docs` URLs point at the current `www.agentskit.io/docs` paths.

## Stack

- Next.js 16 (App Router, standalone output)
- React 19
- Tailwind CSS v4 (PostCSS plugin)
- Zero dependencies on workspace packages — pure marketing surface, no MDX, no SDK examples that drag the agent runtime into the bundle.

## Develop

```bash
pnpm --filter @agentskit/landing dev
```

Opens on http://127.0.0.1:4180.

## Build / start

```bash
pnpm --filter @agentskit/landing build
pnpm --filter @agentskit/landing start
```

## Structure

```
app/
  globals.css           # Tailwind + design tokens
  layout.tsx            # root layout + metadata
  page.tsx              # composition only
  _components/
    header.tsx
    hero.tsx
    code-sample.tsx
    pillars.tsx
    packages-grid.tsx
    install-cta.tsx
    footer.tsx
    links.ts            # all external URLs (single source)
public/
  favicon.svg
```

Add a new section by writing it under `app/_components/` and dropping it into `app/page.tsx`. Keep the file count low; this surface is intentionally narrow.

## Design tokens

Defined in `app/globals.css` under `@theme`:

| token | value |
|---|---|
| `--color-bg` | `#0a0a0b` |
| `--color-bg-soft` | `#131316` |
| `--color-fg` | `#f5f5f7` |
| `--color-accent` | `#7c5cff` |
| `--color-accent-soft` | `#a690ff` |

Mirror updates here into `apps/docs-next/styles/` if cross-surface visual consistency is needed.

## Deploy

- **Vercel** (default): no extra flags. The `vercel.json` here installs with `--frozen-lockfile` and uses an `ignoreCommand` scoped to `apps/landing` + the workspace lockfile so unrelated commits don't trigger a rebuild.
- **Self-hosted** (Cloudflare Pages, Node server, Docker): set `NEXT_OUTPUT_STANDALONE=1` to switch Next to `output: 'standalone'`. Avoid this on Vercel — it bypasses ISR / Edge Functions / Image Optimization.
