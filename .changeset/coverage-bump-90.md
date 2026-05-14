---
"@agentskit/adapters": patch
"@agentskit/cli": patch
"@agentskit/ink": patch
"@agentskit/memory": patch
"@agentskit/react": patch
"@agentskit/vue": patch
---

Test-only: raise lines coverage gate to ≥90% across all packages.

- Adds tests in adapters, cli, ink, memory, react, vue
- Bumps each package's `linesThreshold` to 90 and the shared default
  in `vitest.shared.ts` from 60 to 90
- Hardens `shell-hooks.ts` to ignore EPIPE on stdin and use SIGKILL on
  timeout so the timeout test never hangs
- Adds pnpm overrides for `axios`, `fast-xml-builder`, and `next` to
  resolve transitive high-severity advisories
