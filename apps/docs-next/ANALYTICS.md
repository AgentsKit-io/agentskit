# Docs analytics

The AgentsKit docs site uses **PostHog** to understand which pages work and which don't. This document exists so the behavior is visible and auditable.

## What's tracked

When enabled, the docs site sends:

- **`$pageview`** — fired on every client-side route change, with:
  - `$current_url`
  - `section` (inferred from the path: `home`, `getting-started`, `concepts`, `recipes`, `migrating`, etc.)
- **`$pageleave`** — PostHog's default time-on-page measurement
- **Custom events** we fire explicitly (none today; the `track()` helper in `lib/analytics.tsx` is available)

## What's NOT tracked

- **No PII**. We do not identify users. `person_profiles: 'identified_only'` is set; we never call `posthog.identify()`.
- **No session recordings**. Not enabled.
- **No Do-Not-Track override**. If the browser sends DNT, PostHog respects it and sends nothing.
- **No local or CI telemetry**. PostHog only initializes when `NEXT_PUBLIC_POSTHOG_KEY` is set — it isn't in local dev or in CI.

## Enable it

Set two env vars in the deployment environment (Vercel):

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # or https://eu.i.posthog.com
```

See `apps/docs-next/.env.example`.

## Disable it

Unset `NEXT_PUBLIC_POSTHOG_KEY`. The provider is a no-op in that case — PostHog is never imported at runtime beyond the small client script.

## Privacy

- The PostHog JS client respects **DNT** (`respect_dnt: true`).
- We do not collect IP addresses as personal data. PostHog's default is to hash IPs; we keep that default.
- Users in the EU are served by the EU instance if `NEXT_PUBLIC_POSTHOG_HOST` is set to `https://eu.i.posthog.com`.

## How to use the data

When the site is live and collecting, the maintainers can answer:

- Which sections do new visitors reach first?
- Where do people drop out — on the homepage, on concepts, on recipes, on migrations?
- Which recipes are popular? Which migration guide is consulted more?
- Does the 'For AI agents' section get clicks?

Answers inform what to deepen, what to cut, and what to promote.

## Adding a custom event

```ts
import { track } from '@/lib/analytics'

// Inside a client component:
track('docs.copy_code_block', { page: pathname, lines: code.split('\n').length })
```

Events named `docs.*` or `landing.*` — keep the namespace clear.

## Audit trail

If PostHog is ever swapped or removed, update this doc and the PR that makes the change should include screenshots of what was flowing before the change.
