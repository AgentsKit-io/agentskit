---
---

Add `apps/landing` — standalone Next.js 16 marketing page for AgentsKit, independent from `apps/docs-next`. Closes #230 (P0.19).

Tailwind v4, dark theme, design tokens scoped to the app. No workspace dependencies — pure marketing surface that won't pull the agent runtime into the page bundle. Sections: hero, code sample, four pillars, packages grid, install CTA, footer. Standalone Next output for easy Vercel / Cloudflare / Node deployment.
