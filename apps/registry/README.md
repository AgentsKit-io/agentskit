# @agentskit/registry-app

The fumadocs site for the AgentsKit agent registry — deployed to
**registry.agentskit.io**.

- `/` — agent gallery (search + category filter), SSG.
- `/agents/[id]` — per-agent page, generated at build from the committed index in
  the [`agentskit-registry`](https://github.com/AgentsKit-io/agentskit-registry)
  repo (raw GitHub). The agent source stays decoupled (RFC 0002).
- `/docs/using`, `/docs/authoring`, `/docs/contributing` — guides.

## Deploy (Vercel)

Import the **`agentskit`** monorepo, set **Root Directory = `apps/registry`**,
Framework = Next.js. Point `registry.agentskit.io` at the project.

## Local

```bash
pnpm --filter @agentskit/registry-app dev
pnpm --filter @agentskit/registry-app build
```
