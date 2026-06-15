# scripts/

Repo-level CI helpers. Each script is dependency-free Node ESM, runnable
from the repo root. They run on every PR + push to `main` via
`.github/workflows/ci.yml` and a husky `pre-push` hook.

## `check-quality-gates.mjs` (orchestrator)

Runs every structural gate below in sequence and prints a single pass/fail
summary. This is the entry point — `pnpm check:quality-gates`. `pnpm check:all`
layers typecheck + build + test on top.

```bash
pnpm check:quality-gates
```

To add a gate: write the `check-*.mjs` script, then register it in the `GATES`
array at the top of this orchestrator. Gates strip backtick template contents
before matching so scaffold/prompt strings don't false-positive.

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

## `check-src-test-parity.mjs`

Asserts that every `packages/<pkg>/src/<file>.{ts,tsx}` has at least
one corresponding test reference: a `tests/<basename>.test.{ts,tsx}`,
or any `.test` file in the package whose body imports the source path
or mentions its kebab/camel/Pascal-cased basename. Catches new files
landing without test exposure.

```bash
node scripts/check-src-test-parity.mjs
```

`ALLOW_FILES` / `ALLOW_PREFIXES` at the top of the script track
re-export-only files (`index.ts`, `types.ts`), aggregate-tested
modules, and queued conversions tracked in epic #562.

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

## `check-core-no-deps.mjs`

Asserts `@agentskit/core` declares zero runtime dependencies (Manifesto
principle: core stays pure and under 10KB gzipped). Heavy deps belong in
opt-in packages behind a core injection point.

## `check-stability-tier.mjs`

Asserts every package declares an `agentskit.stability` tier, the value is one
of `alpha | beta | stable`, and it matches that package's row in the
`docs/STABILITY.md` "Current tier map". Catches a missing tier, an undefined
tier value, a package absent from the map, and a stale map row. STABILITY.md is
the single source of truth; this gate keeps package metadata in lockstep with it.

## `check-readme-badge.mjs`

Asserts every package README carries a shields.io stability badge whose tier and
color match the package's declared `agentskit.stability`
(`stable`→brightgreen, `beta`→yellow, `alpha`→orange). Pairs with
`check-stability-tier` so the policy doc, package metadata, and README badge can
never drift apart.

## `check-coverage-floor.mjs`

Ties each package's configured vitest `linesThreshold` to its stability tier
(`stable`→90, `beta`→70, `alpha`→50). Static check on the configured threshold;
the `test:coverage` job enforces actual ≥ configured, so together they guarantee
actual coverage ≥ tier floor. Missing `linesThreshold` falls back to the
vitest.shared default (90).

## `check-promotion-rfc.mjs`

Asserts every package declared `stable` has a promotion RFC in `rfcs/` (filename
or body names it), per `docs/STABILITY.md` (beta→stable requires an RFC
committing the public API). `@agentskit/core` is exempt — it graduated via ADRs
0001-0006 + `docs/RELEASE-CORE-V1.md`. Edit the `EXEMPT` map to add another
documented exemption.

## `check-no-any.mjs`

Forbids the explicit `any` type in package source (`: any`, `as any`, `<any>`,
`any[]`, `Array<any>`). Use `unknown` and narrow. Template/comment contents are
stripped before matching.

## `check-named-exports.mjs`

Forbids `export default` in package source — named exports only. Scaffold code
inside backtick strings (CLI init, templates) is ignored.

## `check-file-size.mjs`

Enforces per-package LOC budgets (default 400; `contracts` 200, `ui` 500).
Files already over budget are pinned in `BASELINE` at their current size:
shrink-only, never raise. See `.agent-memory/project_file-size-baselines.md`.

## `check-doc-index.mjs`

Asserts ADR (`docs/architecture/adrs`) and RFC (`rfcs`) indexes match disk:
every `NNNN-*.md` file is linked from its README, and every indexed link
resolves to a real file.

## `check-intl-parity.mjs`

Docs locale parity. Reads `apps/docs-next/lib/locales.ts`; a locale marked
`full` must have a sibling MDX for every English page under `content/docs`.
`seed`/`partial` locales report coverage without failing; `planned` is skipped.
