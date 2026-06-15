---
name: project_v1-readiness
description: ecosystem-wide v1.0 readiness audit + the honest-tier reconciliation done 2026-06-15
metadata:
  type: project
---

**Fact:** A full 24-package v1.0-readiness audit ran 2026-06-15 (findings +
phased plan in `docs/studies/v1-readiness-audit.md`). Verdict: code quality is
high; the blocker to a coherent v1.0 was **governance drift**, not code.

**Phase 0 landed (truth + guardrails):**
- The 10 packages that claimed `stable` at 0.x with no promotion RFC were
  **demoted to `beta`** (honest path — semver 0.x ≠ stable). `core` stays the
  only `stable`/v1 package. Promote others later, deliberately, via an
  API-freeze RFC + 1.0.0 bump.
- Reconciled `package.json` tier ↔ `docs/STABILITY.md` map ↔ README badges for
  all 24 packages. `integrations` `experimental`→`alpha`; `mcp` got a tier;
  4 missing README badges + the `integrations` README created.
- Added gates [[reference_quality-gates]]: `check-stability-tier`,
  `check-readme-badge`. Added the 5 missing packages to `.size-limit.json`.

**Phase 1 landed (correctness):** orphaned exports re-exported from root (react
`TopologyGraphView`; ink `TopologyGraphView` + theme system) + for-agents docs;
all 5 framework READMEs rewritten to real exports (no phantom components; angular
`init()`; vue reactive without `.value`); `for-agents/memory.mdx` import fixed;
rag bare throws → typed `RagError` (`AK_RAG_*`), templates → core `ConfigError`,
both removed from `check-no-bare-throw` allowlist; changeset added. 15/15 gates +
react/ink/rag/templates tests green.

**Phase 2 landed (promotion discipline):** `check-coverage-floor` gate (stable≥90,
beta≥70, alpha≥50); raised core 80→90, observability 60→85, obs-langfuse 60→90,
sandbox 60→85 (all backed by measured actual coverage). `check-promotion-rfc` gate
— stable needs a promotion RFC (core exempt, ADR-backed); tripwire for future
promotions. Now **17 quality gates**. pre-push test/size wiring left CI-only (DX).

**Phase 3 started (parity + v1 tracking):** vue promoted alpha→**beta** as the
reference binding — 7 headless primitives in `vue/src/components.ts` mirroring
react's `data-ak-*` contract, 100% component coverage. v1.0.0 criteria now tracked
in `docs/V1-READINESS-TRACKER.md` (linked from STABILITY.md). Pattern to replicate:
svelte → solid → react-native → angular, then promote each.

Stale planning docs (ROADMAP-PRD, MASTER-EXECUTION-PLAN, PHASE-0-*) marked
"historical" with banners → living sources STABILITY.md + V1-READINESS-TRACKER.

**svelte promoted to beta (2026-06-15):** full headless component parity — 8
Svelte 5 `.svelte` components + sibling `.svelte.d.ts`. Build: added `esbuild-svelte`
to tsup (dual ESM/CJS preserved); tests: `@sveltejs/vite-plugin-svelte` +
`@testing-library/svelte` `svelteTesting()` in vitest (browser conditions). Two
gates fixed generally to ignore `.d.ts` (check-named-exports — `.svelte.d.ts` need
`export default`; check-src-test-parity — declarations need no test). svelte
threshold 60→70 (beta floor; .ts coverage 100%). Now bindings at beta: vue + svelte.

**solid + react-native promoted to beta (parallel, 2026-06-15):** built concurrently in
isolated git worktrees (opus agents), integrated by file-copy + one `pnpm install`.
solid: Solid JSX + `vite-plugin-solid`/`esbuild-plugin-solid` + `jsxImportSource`. RN:
RN primitives, `testID`-keyed headless (no DOM), vitest `react-native` mock alias, no new
runtime deps. Both 8 components, 100% lines. **4/5 bindings at beta** (vue, svelte, solid,
react-native). Worktree gotcha: agents branch from committed HEAD, not the dirty working
tree — integrate by copying package files + re-verifying with live gates, NOT git-merge.

**angular promoted to beta (2026-06-15):** 8 standalone components, inline templates
(JIT), TestBed tests, `@angular/*` devDeps pinned to core's exact 21.2.17 (peer-strict).
Hardened ChatContainer MutationObserver for partial envs (happy-dom). AOT/`ng-packagr`
build is a tracked follow-up (components are JIT-only today). **All 6 bindings now at
beta parity** (react, ink, vue, svelte, solid, react-native, angular).

**Landed 2026-06-15:** RFC 0004 (Proposed) freezes the framework-binding stable surface
(ChatReturn + 8 `data-ak-*` components) — does NOT promote (beta soak not met; bindings
became beta today). `docs/SEMVER-COMMITMENT.md` = the public ecosystem semver statement
(v1.0.0 criterion #3, documented; honored via gates).

**Remaining (gated, NOT fabricated):** (a) **angular AOT/ng-packagr** — breaks the
CLAUDE.md "tsup, dual CJS/ESM" convention (APF is ESM-only) → needs a convention-exception
decision, not unilateral. (b) **beta→stable promotions** — blocked on ≥1-minor beta soak
(RFC 0004 is the surface half, ready when soak completes). (c) v1.0.0 criteria #1 (external
consumers) + #2 (2-sprint gate hold) — can't be manufactured; need real adoption + elapsed time.
vue worked only because Vue has a runtime `h()` renderer (renders to DOM under
happy-dom). svelte needs a `.svelte` compiler (absent from lockfile), solid needs
babel-preset-solid, angular needs the Angular compiler+TestBed, react-native's
primitives don't render in happy-dom (needs an RN test mock; "headless" for RN =
testID not data-ak-*). Each is a focused per-binding infra task — do svelte first
to set the compiler-based template, once infra investment is approved. Did NOT
generate framework tooling blind (would be debt/broken gates).

**Also open:** empty CHANGELOGs (changeset tooling, not fabricated); version bumps
(maintainer release call); v1.0.0 criteria 1 (external consumers) + 2 (2-sprint hold).

**How to apply:** Tier is now gate-enforced — change a tier in `package.json`,
the STABILITY.md map row, AND the README badge together or gates fail. Don't
re-promote to `stable` without the RFC the policy requires.

**Related:** [[reference_quality-gates]], [[project_playbook-alignment]]
