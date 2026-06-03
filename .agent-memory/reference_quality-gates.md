---
name: reference_quality-gates
description: the structural quality gates, what they enforce, and how to run them
metadata:
  type: reference
---

**Fact:** Structural gates live in `scripts/check-*.mjs` and are orchestrated by
`scripts/check-quality-gates.mjs`. Run all locally with `pnpm check:quality-gates`;
`pnpm check:all` adds lint (typecheck) + build + test. CI runs the orchestrator
(`.github/workflows/ci.yml`) and a husky `pre-push` hook runs gates + lint + build.

Gates:
- `check-core-no-deps` — core has zero runtime deps
- `check-no-bare-throw` — use `AgentsKitError` subclasses, not `throw new Error`
- `check-no-any` — no explicit `any` in package src
- `check-named-exports` — no `export default` in package src
- `check-file-size` — per-package LOC budgets with shrink-only baselines
- `check-src-test-parity` — every src file has a test reference
- `check-for-agents-coverage` — every public export documented in for-agents docs
- `check-doc-index` — every ADR/RFC file linked in its README index
- `check-intl-parity` — `full` locales have complete page coverage

Coverage is gated separately by vitest `linesThreshold` per package
(`vitest.shared.ts` → `createTestConfig`); `pnpm test:coverage` fails under bar.

**How to apply:** Add a new gate → add the script, register it in
`check-quality-gates.mjs`'s `GATES` array, and the docs in
`scripts/README.md`. Gates strip backtick template contents before matching so
scaffold/prompt strings don't false-positive.

**Related:** [[project_file-size-baselines]], [[feedback_zero-dep-core]]
