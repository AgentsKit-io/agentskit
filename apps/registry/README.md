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
| `registry_agent_feedback_submitted` | A visitor rates an agent as `helpful` or `not_helpful` | Which opened agents need quality review? |

Search events contain only a coarse query-length bucket and result count, never the query. Suggested
PostHog funnel: `registry_agent_opened` or `registry_comparison_opened` →
`registry_install_command_copied`, segmented by copy surface. Review this funnel weekly; use search
zero-result counts and comparison drop-off to prioritize catalog improvements.

Agent feedback contains only the agent ID and the structured response. Comments, issue bodies, and
page query strings are never captured. Review the helpful rate alongside agent opens and install
copies to prioritize investigation without treating low-volume agents as low-quality by default.

## Deploy (Vercel)

Import the **`agentskit`** monorepo, set **Root Directory = `apps/registry`**,
Framework = Next.js. Point `registry.agentskit.io` at the project.

## Local

```bash
pnpm --filter @agentskit/registry-app dev
pnpm --filter @agentskit/registry-app build
```
