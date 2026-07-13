# @agentskit/registry-app

The fumadocs site for the AgentsKit agent registry — deployed to
**registry.agentskit.io**.

- `/` — agent gallery with search, filters, ordering, and comparison selection, SSG.
- `/agents/[id]` — per-agent page, generated at build from the committed index in
  the [`agentskit-registry`](https://github.com/AgentsKit-io/agentskit-registry)
  repo (raw GitHub). The agent source stays decoupled (RFC 0002).
- `/compare?agents=<id>,<id>` — temporary, shareable comparison workspace (`noindex`).
- `/docs/using`, `/docs/authoring`, `/docs/contributing` — guides.

## Product analytics

**North star:** weekly visitors who copy at least one agent install command.

The Registry uses the shared PostHog project, but sends only explicit product events. Autocapture,
session recording, exception capture, and person profiles are disabled. Captured URLs are reduced to
their pathname before sending, so free-form search text never leaves the browser. Agent IDs and other
structured catalog choices are sent only through the explicit events below.

| Event | Trigger | Decision it supports |
| --- | --- | --- |
| `registry_agent_opened` | An agent detail page renders | Which agents move discovery forward? |
| `registry_catalog_search_used` | Search settles for 700 ms | Does search return useful coverage? |
| `registry_catalog_filter_changed` | A structured filter changes | Which qualification paths matter? |
| `registry_compare_selection_changed` | Comparison selection changes | Where does comparison become difficult? |
| `registry_comparison_opened` | A valid comparison renders | Which agents are evaluated together? |
| `registry_install_command_copied` | An install command is copied | Did the visit reach activation? |

Search events contain only a coarse query-length bucket and result count, never the query. Suggested
PostHog funnel: `registry_agent_opened` or `registry_comparison_opened` →
`registry_install_command_copied`, segmented by copy surface. Review this funnel weekly; use search
zero-result counts and comparison drop-off to prioritize catalog improvements.

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
`v0.1.0-alpha.2` artifacts. This app owns only the `registry` corpus,
`NEXT_PUBLIC_ASK_ENDPOINT`, Registry branding, CTA, and React slots. AgentsKit
Chat owns the Ask wire contract, streaming adapter, ordered content, standard
`source-list`, memory migration, and application shell. AgentsKit owns
controller lifecycle, messages, cancellation, retry, edit, and regenerate.

Implementation:

- `components/ask-widget.tsx` — native Registry shell, renderer slots, corpus,
  endpoint, and canonical storage identity;
- `@agentskit/chat` — shared Ask adapter and session-memory integration;
- `@agentskit/chat-protocol` — runtime-validated Ask NDJSON boundary and
  ordered event projection.

The adapter always adds `corpus=registry`. It migrates
`ak:ask-thread:registry` and `ak:ask-thread-v2:registry` into canonical
`ak:ask-thread-v3:registry` records. Unknown tools and unsafe citation URLs are
inert.

The former Astro host was removed by Registry RFC 0002 and commit `5d4fc56`;
`AgentsKit-io/agentskit-registry` remains data-only. Do not reintroduce a site or
chat runtime there. The orphaned `src/components/AskWidget.astro` was removed as
part of this migration.

Parity for AgentsKit Chat issue #27 covers the shared protocol and integration
test suites, host typecheck, production generation of all Registry routes,
keyboard/open/close/clear/send semantics, and panel measurements at 375, 768,
1280, and 1440 px with no sub-44 px interactive targets.
