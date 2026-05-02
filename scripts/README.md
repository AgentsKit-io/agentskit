# scripts/

Repo-level CI helpers. Each script is dependency-free Node ESM, runnable
from the repo root.

## `check-for-agents-coverage.mjs`

Asserts that every value export from `packages/<name>/src/index.ts`
appears at least once in
`apps/docs-next/content/docs/for-agents/<name>.mdx`. Catches drift
between code and the agent-discoverable reference page.

```bash
node scripts/check-for-agents-coverage.mjs
```

Exits non-zero on drift, listing each missing symbol per package.
Type-only exports are skipped (the for-agents pages document the
runtime surface, not every supporting type). Per-package exclusions
live in the `IGNORE_EXPORTS` table at the top of the script.

**Wiring into CI:** ready to drop into `.github/workflows/ci.yml` once
the for-agents pages catch up with current main. PRs #718, #721, #722,
#723 add the missing entries; once those land we add this step to
`ci.yml` so the gate blocks future drift.
