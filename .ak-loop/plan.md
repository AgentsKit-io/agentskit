# Plan followed

1. Deleted .vercelignore and the three vercel.json files (none was read by any script; no Cloudflare _headers generator reads them).
2. Removed docs:deploy / docs:deploy:preview from package.json (no cf:deploy existed).
3. lighthouse.yml: removed Vercel preview resolution + bypass; always audits the local production build. lighthouserc.cjs no longer sends bypass headers. Test updated.
4. docs.yml comment fixed; indexnow.yml now triggers on a daily schedule + workflow_dispatch (deployment_status came from Vercel).
5. Removed @vercel/analytics and @vercel/speed-insights (package.json, layout.tsx, lockfile edited by hand to avoid unrelated drift).
6. Removed /_vercel/ route stub in verify-ecosystem-visual.mjs; landing README deploy section updated.
7. Regenerated doc-bridge index; README-standard sourceHash updated for docs-next and landing only (reviewedOn/reviewDueOn kept; the refresh script bumped them, so that was reverted).
