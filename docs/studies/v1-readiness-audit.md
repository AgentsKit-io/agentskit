# v1.0 Readiness Audit — AgentsKit ecosystem

> Audit date: 2026-06-15. Method: per-package audit of all 24 packages + cross-cutting
> guardrail/docs audit, measured against the project's own bar in `docs/STABILITY.md`.

## TL;DR

The substrate is solid (code quality is high — near-zero `any`, no real tech debt in
most packages, clean dep graph). The blocker to a **coherent, future-proof v1.0 is
governance drift**, not code: the stability tiers, the policy doc, the README badges,
and the version numbers all tell different stories. Three concrete correctness bugs and
a set of doc/guardrail gaps round it out.

## State of the ecosystem

| Tier (package.json) | Packages |
|---|---|
| `stable` | core (**1.8.0**, only one truly past v1), adapters, cli, ink, memory, rag, react, runtime, skills, templates, tools |
| `beta` | eval, eval-braintrust, observability, observability-langfuse, validation, sandbox |
| `alpha` | angular, react-native, solid, svelte, vue |
| `experimental` (invalid) | integrations |
| none declared | mcp |

## A. Governance / cohesion (highest severity)

1. **`docs/STABILITY.md` tier map is stale.** Lists 19 packages; repo has 24.
   - 5 absent: eval-braintrust, integrations, mcp, observability-langfuse, validation.
   - 12 of 19 entries contradict package.json (adapters/cli/ink/memory/react/runtime/skills/tools listed beta→actually stable; rag/templates listed alpha→actually stable; eval/sandbox listed alpha→actually beta).
   - Only 7 entries accurate. This is the primary consumer-trust document.
2. **10 packages declare `stable` at 0.x with no promotion RFC.** Policy (`STABILITY.md`)
   requires beta→stable to have an RFC freezing the public API + ≥1 minor at beta without
   breaking. Only RFCs 0001-0003 exist; none are promotion RFCs. (`check:rfc-0007` from
   prior memory belongs to the **AKOS** repo, not this one.)
3. **Semver contradicts the `stable` claim** for the 10 packages: 0.x signals pre-stable by
   npm convention.
4. **`mcp` declares no tier** (no `agentskit` field) — violates "every package declares a tier".
5. **`integrations` uses `experimental`** — not one of the 3 documented tiers.
6. **Three-way mismatches** (pkg.json ≠ STABILITY.md ≠ README badge): eval, sandbox, templates.

## B. Real correctness / doc bugs (confirmed)

1. **react: `TopologyGraphView` orphaned** — implemented + 12 tests, exported from
   `src/components/index.ts` but missing from `src/index.ts`. Unreachable from package root.
2. **ink: `InkThemeProvider`, `useInkTheme`, `defaultInkTheme`, `TopologyGraphView` orphaned**
   — same pattern; the entire theme system is unreachable from the package root.
3. **All 5 framework-binding READMEs are broken**: hardcoded `stability-stable` badge on
   `alpha` packages, and Quick-Start examples import phantom components (`Message`,
   `InputBar`, `ChatContainer`) that don't exist in `src/index.ts`. Copy-paste fails on import.
   Angular additionally documents `configure()` while the service exposes `init()`.
4. **`for-agents/memory.mdx`** imports `createVirtualizedMemory` from `@agentskit/memory`,
   but it lives in `@agentskit/core` — the documented example fails at runtime.
5. **Empty CHANGELOGs across every package** — all contain only `# Changelog`. Zero
   auditability; cannot verify the "≥1 minor at beta without breaking" criterion for any package.
6. **Bare `throw new Error`** (no typed error) in rag (13, no `RAGError` type), templates
   `validate.ts` (7), cli (20). Gate-allowlisted in some paths, masking the gap.

> NOTE: an earlier draft flagged a dead-code dynamic-import bug in `memory/src/turso.ts` —
> **false positive**, verified the import is present and correct (turso.ts:31).
> Core's README "5 KB gzipped" claim should be re-measured against the dist, but the CI
> size-limit gate (10 KB) and `RELEASE-CORE-V1.md` (5.17 KB) suggest it is roughly accurate.

## C. Guardrail gaps (no gate catches these today)

1. **No stability-tier gate** — nothing asserts the tier exists, is a valid value, or matches
   STABILITY.md. (Would have caught mcp + integrations + all 12 drifts.) Highest ROI.
2. **No coverage-floor ↔ tier link** — core (stable) @80, tools (stable) @70; bars are hand-set.
3. **No promotion-RFC gate** — 10 stable packages have none.
4. **No README-badge gate** — badges hand-maintained, drift unverifiable.
5. **5 packages absent from `.size-limit.json`** — eval-braintrust, integrations, mcp,
   observability-langfuse, validation have no bundle budget.
6. **`check-intl-parity` is inert** — never fires (no locale is `full`).
7. **`check-count-drift` skips `apps/registry/`.**
8. **Tests + size-limit not wired to pre-push** — CI-only.

## D. Framework parity

All 5 bindings sit at 1–2 of react's 16 exports. To reach beta each needs: the full headless
component suite (8 components per framework), the 5 core re-exports, and `useStream` /
`useReactive` equivalents. This is the largest single body of work.

## E. Project-level v1.0.0 criteria — untracked

`STABILITY.md` "Until v1.0.0" lists 3 criteria (external consumer per core contract; CI gates
held 2 sprints without regression; public semver commitment). None are tracked anywhere.

## F. Stale planning docs

`RELEASE-CORE-V1.md`, `ROADMAP-PRD.md`, `MASTER-EXECUTION-PLAN.md` reference the 14-package era
and are 10+ packages out of date with no living-doc update process. Mark historical or refresh.

---

## Plan (phased)

### Phase 0 — Truth + guardrails (cheap, unblocks everything)
- Decide the honest tier for each package (see open decision below) and **reconcile
  STABILITY.md ↔ package.json ↔ README badges** to a single source of truth.
- `mcp`: declare a tier. `integrations`: `experimental` → `alpha` (or add tier to policy).
- Add `check-stability-tier.mjs` (exists + valid value + matches map). Register in gates.
- Add `check-readme-badge.mjs`; derive badges from `package.json.agentskit.stability`.
- Add the 5 missing packages to `.size-limit.json`.

### Phase 1 — Honesty / correctness fixes ✅ DONE (2026-06-15)
- ✅ Orphaned exports fixed: react `TopologyGraphView`; ink `TopologyGraphView` + theme
  system now re-exported from package root (+ for-agents docs updated).
- ✅ All 5 framework-binding READMEs rewritten to real exports (no phantom components;
  angular `init()` not `configure()`; vue reactive access without `.value`).
- ✅ `for-agents/memory.mdx` import fixed (`createVirtualizedMemory` is a core export).
- ✅ Bare throws converted to typed errors: rag → new `RagError` (`AK_RAG_*` codes),
  templates → core `ConfigError`; both removed from the `check-no-bare-throw` allowlist.
- ✅ Changeset added (`.changeset/ecosystem-cohesion-phase-1.md`) for the user-facing changes.
- DEFERRED — CHANGELOGs left to changeset tooling (no fabricated history). Tier-demotion
  version bumps for the 10 packages left for the maintainer's release call.

Verification: 15/15 quality gates pass; react/ink/rag/templates typecheck clean;
react 72 + ink 113 + rag 61 + templates 29 tests pass.

> The earlier false-positive (turso dead-code) was confirmed non-existent and dropped.

### Phase 2 — Promotion discipline ✅ DONE (2026-06-15)
- ✅ `check-coverage-floor.mjs` added (stable ≥90, beta ≥70, alpha ≥50), registered in
  the orchestrator. Raised thresholds to clear the floor against measured actual coverage:
  core 80→90 (actual 92.6%), observability 60→85 (90.5%), observability-langfuse 60→90
  (98.4%), sandbox 60→85 (90.5%). tools stays 70 — now correctly a `beta` package, 70 = beta floor.
- ✅ `check-promotion-rfc.mjs` added — every `stable` package needs a promotion RFC in
  `rfcs/`; `core` exempt (ADR-backed). No package is stable-without-RFC today, so it's a
  tripwire for future promotions: flip a package to stable → gate demands the RFC.
- DEFERRED — pre-push test/size wiring left CI-only on purpose: full test + coverage on
  every push (ink alone ~26s) would degrade DX; CI already enforces both. Revisit if
  pushes start landing coverage regressions.

Verification: 17/17 quality gates pass; the 4 raised packages pass `test:coverage`.

### Phase 3 — Parity + ecosystem v1.0 🟡 STARTED (2026-06-15)
- ✅ **vue promoted alpha→beta** as the reference binding: 7 headless primitives
  (`Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`,
  `ToolConfirmation`) mirroring react's `data-ak-*` contract, in `vue/src/components.ts`.
  100% component coverage (20 vue tests); for-agents + README updated; changeset added.
- ✅ **v1.0.0 criteria tracker** created (`docs/V1-READINESS-TRACKER.md`), linked from
  STABILITY.md — closes the "untracked" gap with a living status table + parity matrix.
- ✅ **svelte promoted alpha→beta** — 8 Svelte 5 `.svelte` headless components + sibling
  `.svelte.d.ts`; build wired with `esbuild-svelte` (dual ESM/CJS kept), tests via
  `@sveltejs/vite-plugin-svelte` + `@testing-library/svelte`. Two gates generalized to
  ignore `.d.ts` (named-exports, src-test-parity). 14 svelte tests; for-agents + README + changeset.
- ✅ **solid + react-native promoted alpha→beta** (built in parallel via isolated git
  worktrees, then integrated by file-copy + a single `pnpm install`). solid: 8 Solid-JSX
  components (`vite-plugin-solid`/`esbuild-plugin-solid`, `jsxImportSource: solid-js`),
  27 tests, 100% lines. react-native: 8 components on RN primitives, `testID`-keyed
  headless (no DOM/`data-ak-*`), vitest `react-native` mock alias, 24 tests, 100% lines.
- ✅ **angular promoted alpha→beta** — 8 standalone components (inline templates, JIT),
  `@angular/compiler`/`platform-browser-dynamic` devDeps pinned to core's 21.2.17, TestBed
  tests (18, via `tests/setup.ts` JIT env), 96.5% lines. Hardened ChatContainer's
  MutationObserver against partial (happy-dom) envs. AOT/`ng-packagr` build tracked as
  follow-up (components are JIT today). **All 6 bindings now at beta parity.**

Parallelization note: worktree agents branch from committed HEAD (NOT the uncommitted
working tree), so integration was file-copy + re-verify with the live gates, not git-merge.

### Phase 3 — closing artifacts (2026-06-15)
- ✅ RFC 0004 (Proposed) — freezes the framework-binding stable surface; the promotion
  half waits on the per-binding beta soak (≥1 minor). Honest forward doc, not a promotion.
- ✅ `docs/SEMVER-COMMITMENT.md` — ecosystem-wide public semver statement (v1.0.0 criterion #3).
- Gated / not fabricated: **angular AOT** (breaks the tsup/dual-CJS-ESM convention → needs an
  exception decision); **beta→stable promotions** (await beta soak); **external consumers**
  + **2-sprint gate hold** (require real adoption + elapsed time — cannot be manufactured).
- ✅ Stale planning docs marked historical: `ROADMAP-PRD`, `MASTER-EXECUTION-PLAN`,
  `PHASE-0-FOUNDATION-PRD`, `PHASE-0-EXECUTION-PLAN` got a "historical planning artifact"
  banner pointing to the living sources (STABILITY.md + V1-READINESS-TRACKER);
  `RELEASE-CORE-V1` got a point-in-time note.

**Binding-parity infra blocker (decision needed):** the other 4 bindings are NOT a
quick vue-style replicate. vue worked because Vue ships a runtime `h()` renderer that
renders to real DOM under happy-dom. The rest each need framework-specific build/test
infra that isn't wired yet:
- **svelte** — `.svelte` files need a compiler (no `vite-plugin-svelte`/`esbuild-svelte` in the lockfile) + a test plugin.
- **solid** — JSX needs `babel-preset-solid` (or `solid-js/h`) + matching test transform.
- **angular** — `@Component`s need the Angular compiler + TestBed.
- **react-native** — components build fine, but RN primitives (`View`/`Text`/…) don't render in happy-dom; needs an RN test mock or a different env, and "headless" for RN means `testID`/style, not `data-ak-*` — a design call.

Each is a focused per-binding infra task, not a mechanical copy. Recommend doing svelte
first (establishes the compiler-based-binding template) once the infra investment is approved.

Verification: 17/17 quality gates pass; vue 20 tests + 100% component coverage.

## Open decision (drives Phase 0–2)

The 10 packages declaring `stable` at 0.x with no RFC need one of:
- **(A) Honest demote now** — set them to `beta` to match semver + policy; promote later,
  deliberately, via RFC + 1.0.0 bump. Fast, honest, low risk.
- **(B) Commit to stable now** — write the 10 promotion RFCs, freeze the APIs, bump to 1.0.0.
  Higher effort, commits to frozen contracts immediately.
