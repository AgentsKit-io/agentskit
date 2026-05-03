---
"@agentskit/ink": patch
---

Add visual regression coverage for `@agentskit/ink` components — issue #253 (P0.42).

`packages/ink/tests/visual.snap.test.tsx` snapshots the raw ANSI frame from `ink-testing-library` for every public component (Message, ToolCallView, ToolConfirmation, StatusHeader, ThinkingIndicator, InputBar) plus a ChatContainer composite, across stable role / status combinations. Snapshots capture color, style, and layout — any drift from a Box / Text refactor or theme change will fail the suite.

Frozen `2026-01-01` dates, first-render-only sampling (so spinner / cursor frames stay deterministic), no animation timer dependence. Runs as part of standard `pnpm --filter @agentskit/ink test`.

The React-side companion lives in the new `apps/visual-react/` Vite + Playwright harness — it is not bundled with `pnpm test` because it requires a Chromium browser binary; see `apps/visual-react/README.md` for setup, baseline, and CI integration steps.
