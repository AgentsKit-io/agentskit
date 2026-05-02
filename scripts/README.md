# scripts/

Repo-level CI helpers. Each script is dependency-free Node ESM, runnable
from the repo root. Both run on every PR + push to `main` via
`.github/workflows/ci.yml`.

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

## `check-no-bare-throw.mjs`

Asserts that no `throw new Error(...)` appears in package source code
outside the typed-error definitions. Use one of the `AgentsKitError`
subclasses (`AdapterError`, `ToolError`, `MemoryError`, `RuntimeError`,
`SandboxError`, `SkillError`, `ConfigError`) so every error carries a
stable `code`, `hint`, and `docsUrl`.

```bash
node scripts/check-no-bare-throw.mjs
```

The allowlist at the top of the script tracks files that legitimately
hold bare throws: `errors.ts` itself, files where the bare `Error` is
caught and rewrapped (embedder `fetchAvailableModels`), and CLI/leaf
modules whose conversions are queued in the enterprise-readiness
backlog. The list shrinks as those conversions land.
