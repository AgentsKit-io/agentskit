# Factory playbook — AgentsKit

Read before every stage. Monorepo: pnpm 10 + Turborepo + Changesets. Also read `AGENTS.md` and the `CONVENTIONS.md` of the package you edit.

## 1. Install
- Node 22 in CI (any Node >= 22 works locally), pnpm `10.34.4` (`packageManager` in `package.json`; use corepack).
- Exact CI command: `pnpm install --frozen-lockfile`.
- Stale lockfile (frozen install fails): run `pnpm install`, commit the `pnpm-lock.yaml` change in its own `build:` commit. Never hand-edit the lockfile.
- No env vars are needed to build/test. Postgres tests read a connection URL variable (see `.github/workflows/ci.yml`); skip them locally.
- `HUSKY=0` skips git hooks; do not rely on it for the final check (pre-push only typechecks changed packages; run the quick verification and `pnpm check:quality-gates` yourself).

## 2. Run locally
- Docs: `pnpm docs` (Next.js, `apps/docs-next`). Examples: `pnpm dev` (turbo, all `dev` tasks). Most tickets are library code and need no running app.

## 3. Quick verification (small diff)
Build first when you touch a package other packages import (they consume `dist/`).
- `pnpm --filter @agentskit/<pkg> build`
- `pnpm --filter @agentskit/<pkg> lint` (this is `tsc --noEmit`, the typecheck)
- `pnpm --filter @agentskit/<pkg> test`
- One test file: `pnpm --filter @agentskit/<pkg> exec vitest run path/to/file.test.ts`
- Root `scripts/*.test.mjs`: `pnpm exec vitest run scripts/<file>.test.mjs` (or `node --test` for those that use it, see `package.json`).
- Always finish with `pnpm check:quality-gates`.
- Affected-only, like CI: `pnpm exec turbo run build lint test --filter='...[origin/main]' --concurrency=2` (this is `verify` in `.github/factory.json`).

## 4. Full verification (CI, `.github/workflows/`)
`ci.yml`:
- **Commitlint**: every commit of the PR.
- **Changeset lint**: `pnpm changeset status --since=origin/main` when `packages/**` source changed.
- **Quality gates**: build, `check:publication-surface`, `check:packed-consumers`, `check:publish-manifests`, `check:public-api-snapshot`, lint, `docs:bridge:index`, `check:quality-gates`, `docs:bridge:freshness`, `docs:bridge:gate`, `docs:bridge:conformance`. Touching root config, `scripts/` or `.github/` makes it run for ALL packages (slow).
- **Test, Build**: `turbo run test --concurrency=2`. **PostgreSQL contract**: slow, needs a service container. **Lint, Test, Build** is the aggregate required check.
- Compatibility matrix (Node versions) and cross-platform jobs.
Other workflows: `coverage.yml` (`pnpm test:coverage`, required), `size.yml` (`pnpm size`, core < 10 KB gzip, required), `e2e.yml` and `visual.yml` (Playwright, slow, flaky: baselines), `docs.yml`, `link-check.yml`, `lighthouse.yml`, `codeql.yml`, `dependency-review.yml` (`pnpm audit`-style alerts come from the lockfile), `doc-bridge-index.yml`.

## 5. Rules that most often fail PRs
- **Commitlint**: header <= 72 chars, `type(scope): subject`; types: arch build chore ci docs feat fix merge perf quality refactor release reliability revert security style test. Check each commit: `echo "<msg>" | pnpm exec commitlint`.
- **Changesets**: user-facing change in `packages/*/src` needs `.changeset/<slug>.md` (frontmatter `'@agentskit/<pkg>': patch|minor`, body starts with a `feat:`/`fix:` line). No `changelog.d/` here; never bump versions or edit `CHANGELOG.md`.
- **Quality gates** (`scripts/check-quality-gates.mjs`): file-size budgets (split files, never raise baselines), no `any`, named exports only, errors, exports, parity, docs, no nested ternary.
- Core: zero deps, < 10 KB gzip.
- Public API change: `pnpm check:public-api-snapshot:update` and commit the snapshot.
- Private consumer data never goes in code, tests, docs or commits (`docs/PRIVATE-CONSUMER-POLICY.md`); use synthetic fixtures.

## 6. Shared registry files (conflict-prone)
- `.doc-bridge/index.json`, `.doc-bridge/capabilities.json`, `.doc-bridge/llms.txt`, `llms.txt`: generated. Never hand-edit or resolve by hand: after a merge run `pnpm docs:bridge:index` and commit the result (needed whenever docs, package READMEs or exports change).
- `pnpm-lock.yaml`: on conflict take the base side, then `pnpm install`.
- `.changeset/`: one new uniquely named file per ticket (use the ticket id in the name); never edit existing ones.
- `ecosystem.json`, `readme-standard-v1.json`, `docs/` generated lists (`pnpm gen:support-matrix`, `pnpm readme:standard:refresh`, `pnpm metadata:generate`): regenerate, do not hand-merge.
- Version pins that must agree across workspaces (e.g. `vitest` in every `package.json`): copy the version main uses. A `release-train.json` may exist on some branches; if so, keep `current`/`minimum` aligned to main.

## 7. Known pitfalls (real factory failures)
- **"New changes require approval from someone other than the last pusher"** (21x, deliver): a repo ruleset needs a second approver; not fixable in code. Do not push extra commits after approval (each push dismisses stale reviews); finish everything before the last push.
- **"Pull Request has merge conflicts"** (4x): the branch is stale. `git merge origin/main` (never rebase), regenerate the files from section 6, re-run the quick verification.
- **"CI red: Commitlint"** (2x): bad header (too long, wrong type, no scope-less junk). Validate every commit message with commitlint before finishing; the station's reword round may change messages only.
- **"proof fails on merged head: @agentskit/<pkg>:build"** (adapters, tools; 3x): a package's `dist/` build breaks once merged with main (new catalog/exports). After merging main, run `pnpm --filter @agentskit/<pkg> build` plus its dependents, then lint and test; run the build, not only the tests.
- **Vitest version drift** (`apps/example-channels` and `release-train.json`, 2x): a new workspace must use the same `vitest` range as the others (`grep -rn '"vitest"' --include=package.json apps packages`); update `release-train.json` if present.
- **Doc-bridge index stale** (1x): run `pnpm docs:bridge:index` and commit `.doc-bridge/*` and `llms.txt` whenever docs/READMEs/exports change.
- **Reword round changed code** (1x, verify): when rewriting commit messages, touch nothing else; commit code fixes beforehand with their own correct messages.
