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

Asserts every package declared `stable` has a **dedicated Accepted** promotion
RFC in `rfcs/`, per `docs/STABILITY.md` (beta→stable requires an RFC committing
the public API). Requirements:

- Filename must be exactly `NNNN-<package-directory>-stable.md`
  (e.g. `packages/react` → `0012-react-stable.md`).
- Body must include exact metadata lines:
  `- **Package**: \`@agentskit/<name>\`` (backticks optional) and
  `- **Status**: Accepted`.
- A general RFC that merely mentions the package is **not** enough.
- A dedicated RFC still at `Proposed` is **not** enough.

`@agentskit/core` is the sole documented exemption — it graduated via ADRs
0001-0006 + `docs/RELEASE-CORE-V1.md`. Pure helpers live in
`scripts/lib/stability-gates.mjs` (covered by `scripts/stability-gates.test.mjs`).

## `check-stable-dependencies.mjs`

Asserts that every workspace package with `agentskit.stability: "stable"` only
depends on other **stable** internal `@agentskit/*` packages in
`dependencies`, `optionalDependencies`, and `peerDependencies`.

- `devDependencies` are ignored (test-only wiring is fine).
- External (non-`@agentskit`) dependencies and peers are permitted.
- Core is not special-cased; it passes because it declares no runtime deps.

Registered in `check-quality-gates.mjs` immediately after the promotion-RFC
gate. Helpers: `scripts/lib/stability-gates.mjs`.

## `check-stability-evidence.mjs`

Asserts every **non-exempt** package declared `stable` has a valid graduation
evidence manifest at `docs/stability/<package-directory>.json` (ADR 0024 /
`docs/stability/README.md` schema version 1):

- `schemaVersion` exactly `1` and `package` matching `package.json` name
- real UTC calendar dates for `betaSince` / `proposedStableDate`
- `proposedStableDate` not in the future and ≥ 90 full calendar days after `betaSince`
- ≥ 2 `qualifyingMinorReleases` with semver-like `x.y.z` dates inside the window,
  spanning **two distinct major.minor lines** (two patches on one minor fail)
- all seven evidence axis paths present, normalized safe repo-relative, and
  existing as files under the repo root

`@agentskit/core` is the sole exemption. Beta/alpha packages may omit the file
until graduation work begins — missing evidence is not a gate failure for them
(use the scorecard below). Registered in `check-quality-gates.mjs` immediately
after the stable-internal-dependencies gate.

```bash
pnpm check:stability-evidence
```

## `report-stability-readiness.mjs`

Prints a deterministic Markdown scorecard for **every** workspace package,
sorted by package name, evaluating each as a *candidate* for stable without
changing tiers or files. Columns:

`Package | Tier | Conventions | Stable deps | Promotion RFC | Evidence | Soak | Axes | Ready`

- Core shows `exempt` for promotion/evidence/soak/axes and `ready=yes` when
  conventions + stable deps pass.
- Non-core missing work is `pending`/`no` — never a process error.
- `Ready=yes` only when every required condition is satisfied.

```bash
pnpm report:stability-readiness
```

Helpers for both scripts live in `scripts/lib/stability-gates.mjs` (covered by
`scripts/stability-gates.test.mjs`).

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

## `check-packed-consumers.mjs`

Offline packed-consumer publication contract for every public `packages/*`
artifact. Proves each package can be packed and that its declared publication
surface is internally coherent for real consumers.

**Prerequisite:** package dist outputs must already exist:

```bash
pnpm --filter "./packages/*" build
pnpm check:packed-consumers
```

**Scope (this harness):**

1. Discover non-private packages dynamically.
2. `pnpm pack --pack-destination <temp>/tarballs` per package (local only;
   lifecycle scripts disabled; no install / no registry).
3. List + extract tarballs with system `tar` after rejecting absolute paths and
   `..` traversal; always clean up temp dirs.
4. Validate the *packed* manifest: no `workspace:` protocol, every
   `exports`/`main`/`module`/`types`/`svelte`/`bin` target exists as a file
   inside the package, bins have a Node shebang (never executed), and tarball
   contents are dist-centric (npm metadata files + `dist/**` only).
5. Batch safe ESM `import` and CJS `require` against extracted packages via a
   temporary `node_modules/@agentskit` tree (external deps reused from the
   repo install). Never invokes exports, bins, network, native backends, MCP
   stdio, CLI commands, or tools.
6. Compile clean TypeScript consumer fixtures with TypeScript 5.9 and 6.0,
   each using `moduleResolution: bundler` and `NodeNext` (no emit).

**Out of scope / complementary:** package-owned Metro/Vite/AOT interop tests
(`packages/eval/tests/bundler-interop.*`, `packages/rag/tests/metro-bundle.*`,
`packages/angular/tests/package-aot.test.ts`) remain authoritative for
browser/RN/Angular host resolution. Named exceptions (CSS theme, Angular APF,
Svelte ESM-only, React Native structural, optional peer subpaths) live in
`scripts/lib/packed-consumers-matrix.mjs`.

Pure helpers: `scripts/lib/packed-consumers.mjs`. Unit tests:

```bash
pnpm test:packed-consumers
# or: node --test scripts/packed-consumers.test.mjs
```

## `check-public-api-snapshot.mjs`

Deterministic, versioned **public TypeScript API snapshot** for every non-private
`packages/*` export subpath. Complements packed-consumer (runtime/pack) checks:
this gate only inspects declaration surfaces via the repository TypeScript
compiler API and fails on symbol/subpath/condition drift.

**Prerequisite:** package dist declaration outputs must already exist:

```bash
pnpm --filter "./packages/*" build
pnpm check:public-api-snapshot
# or: node scripts/check-public-api-snapshot.mjs
```

**Baseline:** `docs/stability/public-api-v1.json` (`schemaVersion: 1`). No
timestamps, absolute paths, package versions, or machine-specific values.

**Behavior:**

1. Discover non-private packages dynamically (sorted by package name).
2. Enumerate every public export subpath (string exports, conditional root,
   subpath maps, arrays, classic `types`/`main`/`module` fallback).
3. Recursively collect `types`/`typings` targets. CSS/JS-only surfaces without
   declarations are recorded as `#asset:…` symbols (never silently dropped).
4. One `ts.createProgram` over unique declaration roots (`noEmit`,
   `skipLibCheck`, NodeNext). Missing or unreadable declarations fail the run;
   a partial/stale baseline is never accepted.
5. `TypeChecker.getExportsOfModule` + `SymbolFlags` classification
   (`type` / `value` / both). Export names are preserved; aliases resolve only
   for kind classification. Full type strings are not serialized.
6. Snapshot sorted public condition names per subpath (not private chunks).

**Update / review policy:**

- Intentional public API changes require an explicit baseline refresh and PR
  review of the JSON diff (treat additions/removals/kind changes as semver
  signal for the affected package).
- Refresh:

```bash
node scripts/check-public-api-snapshot.mjs --update
# or: pnpm check:public-api-snapshot:update
```

- Unknown CLI flags are refused. Optional peers must not affect the snapshot
  (declaration-only; does not require peers installed).

Pure helpers: `scripts/lib/public-api-snapshot.mjs`. Unit tests:

```bash
pnpm test:public-api-snapshot
# or: node --test scripts/public-api-snapshot.test.mjs
```

Wired in CI after `packages/*` build, and in release after build /
`check:publication-surface` and before publish.

### Release registry preflight

`check-release-registry.mjs` compares every public package manifest with the npm
registry. It rejects local versions behind `latest` and prevents pending
changesets from being stacked on versions that are committed but still
unpublished. The release workflow also exposes an explicit manual recovery path.
See [`docs/RELEASE-RUNBOOK.md`](../docs/RELEASE-RUNBOOK.md).

```bash
pnpm check:release-registry
pnpm test:release-registry
```

CI runs the blocking compatibility contract on Node 22 (the main quality job)
and Node 24, plus a non-blocking Node 26 canary. The numeric matrix follows the
Node.js lifecycle policy in ADR 0025: supported LTS lines block, the current
pre-LTS line warns, and EOL lines are removed.
