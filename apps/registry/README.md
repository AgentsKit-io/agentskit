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

## AgentsKit Chat dogfood

The floating **Ask Registry** surface consumes the immutable
`@agentskit/chat`, `@agentskit/chat-protocol`, and `@agentskit/chat-react`
`v0.1.0-alpha.1` artifacts. This app owns only the `registry` corpus,
`NEXT_PUBLIC_ASK_ENDPOINT`, Registry branding, CTA, safe wire projection, and
React slots. AgentsKit Chat owns the definition, ordered content, standard
`source-list`, and application shell. AgentsKit owns controller lifecycle,
messages, streaming, memory, cancellation, retry, edit, and regenerate.

Implementation:

- `components/ask-widget.tsx` — native Registry shell and renderer slots;
- `components/ask-chat/ask-adapter.ts` — runtime-validated Ask NDJSON boundary,
  ordered content projection, and canonical `ChatMemory`;
- `components/ask-chat/ask-adapter.test.ts` — corpus, citations, invalid events,
  cancellation, and legacy migration evidence.

The adapter always adds `corpus=registry`. It migrates
`ak:ask-thread:registry` and `ak:ask-thread-v2:registry` into canonical
`ak:ask-thread-v3:registry` records. Unknown tools and unsafe citation URLs are
inert.

The former Astro host was removed by Registry RFC 0002 and commit `5d4fc56`;
`AgentsKit-io/agentskit-registry` remains data-only. Do not reintroduce a site or
chat runtime there. The orphaned `src/components/AskWidget.astro` was removed as
part of this migration.

Parity for AgentsKit Chat issue #27 covers five adapter tests, typecheck,
production generation of all Registry routes, keyboard/open/close/clear/send
semantics, and panel measurements at 375, 768, 1280, and 1440 px with no
sub-44 px interactive targets.
