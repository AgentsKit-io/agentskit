---
'@agentskit/core': patch
---

chore: Sprint A enterprise-readiness foundation pass.

Mechanical-only changes — no code-path behaviour changes:

- **Delete orphan `packages/framework-adapters/`** — package had no
  `package.json`, no `src/`, no tests, no stability declaration; built
  artefacts were already covered by the dedicated `@agentskit/{angular,
  react-native, solid, svelte, vue}` packages. Confirmed not published
  to npm. Closes audit issues A/P0 (decide), A/P0 (npm-verify), A/P1
  (workspace-align).
- **Lock `@agentskit/core` size budget** — `.size-limit.json` ESM/CJS
  entries lowered from 10 KB → 9.8 KB to surface regressions earlier
  (current CJS gzipped = 9.62 KB, 180 B headroom). Closes B/P0
  (size-limit lock).
- **`.size-limit.json` add 5 missing UI bindings** — `angular`,
  `react-native`, `solid`, `svelte`, `vue` now gated at 5 KB each
  (current sizes 337 B – 861 B). Closes C/P0 (size-limit gaps).
- **Raise `@agentskit/core` lines threshold 75 → 80** — sacred
  CLAUDE.md target. Current actual 91.97%. Closes B/P0 (core
  threshold).
- **`for-agents/*.mdx` documentation drift** — re-aligned every
  for-agents reference page with its package's public surface. Skills
  + 10 (incl. vertical), adapters + 7, memory + 6, observability + 4,
  rag + 6, tools + 14 integrations, runtime + flow/cron, core + token
  budget / progressive / multi-modal helpers, react + useStream /
  useReactive, ink + StatusHeader / ToolConfirmation / MarkdownText,
  cli + ~25 programmatic exports. Closes F/P0 (×8) + F/P1 (×3).
