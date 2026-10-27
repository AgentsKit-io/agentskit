# Plan followed

1. Searched for readers of vercel.json: none in scripts/tests/workflows (only README prose). No _headers generator exists, so Cloudflare output is unaffected.
2. Deleted .vercelignore and apps/{docs-next,landing,registry}/vercel.json (no tracked .vercel/ dir).
3. Removed root docs:deploy and docs:deploy:preview scripts (Vercel CLI only); no Cloudflare equivalent exists in this repo, so nothing replaces them.
4. lighthouse.yml: dropped preview resolution/bypass steps; the local production build + next start path is now the only path. lighthouserc.cjs no longer sends bypass headers. Updated the workflow contract test in scripts/reference-docs-vertical.test.mjs.
5. docs.yml / indexnow.yml / ping-indexnow.mjs: Vercel wording removed; indexnow keeps deployment_status and workflow_dispatch triggers.
6. Removed @vercel/analytics and @vercel/speed-insights (package.json, layout.tsx, lockfile edited by hand to avoid unrelated version bumps).
7. Cleaned .dockerignore, .gitignore files, next.config.mjs comments, landing README deploy section.
8. Regenerated doc-bridge index (docs:bridge:index) and the two README sourceHash values; reviewedOn/reviewDueOn restored to their original values.
9. Rewrote one historical changelog chunk in the generated ask index so the package name no longer appears outside md/mdx.
No changeset: only private apps changed.
