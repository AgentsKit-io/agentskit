# CH-C3: remove the global React type workaround

State: AWAITING_HUMAN_APPROVAL; worker implementation and checks are validated,
with coordinator review outstanding. No current blocker remains.

## Contract and budget

Approved intent: fix dependency resolution in this worktree without a global
hoisting workaround. Scope: revert CH-C2's `.npmrc` and root `package.json`
additions, keep the lockfile minimal, investigate memory's Drizzle/pg metadata,
run docs-next type-check/build, memory build/test (242), ratchets, global tests,
quality gates and doc-bridge freshness, make small local commits and report here.
No push, PR, publication, deployment, real credentials, unrelated process cleanup
or changes to other packages. No UI implementation or public contract changes;
UI visual approval and a structural ADR are not applicable. This dispatch is
goal authorization; final approval belongs to the coordinator.

Budget: local/offline dependency installs, existing repository checks and cached
Turbo evidence, `--concurrency=2`, `VITEST_MAX_WORKERS=1`; no CI. One task-owned
trust-auth PostgreSQL 16 container bound to 127.0.0.1:55440 provides the required
real database test. An isolated manifest-only install tests fresh hoisting;
its directory is task-owned and is removed after inspection.

## Findings and smallest repair

- Reverted the two hoist-pattern lines and root `@types/react` dev dependency.
  The lockfile differs by only the three corresponding importer lines; no
  dependency versions or peer snapshots change. Frozen offline installation
  accepts this lockfile. An initial unfrozen install refreshed unrelated
  Cloudflare snapshots; that churn was discarded before validation.
- Memory already declares Drizzle and pg optional peers, with both present as
  dev dependencies and `@types/pg` available for development. Their metadata
  needs no additional change. Adding a React dev dependency to memory would
  introduce an unrelated dependency with no supporting evidence.
- Drizzle 0.45.3 declares `@types/react` ^18.2.45 only in its own devDependencies,
  **not** in peerDependencies or dependencies. Published dependency installation
  does not install a library's devDependencies. `pnpm --filter @agentskit/memory
  why @types/react` has no result. pg likewise has no React dependency.
- `pnpm why -r @types/react` identifies the React 18 path as:

  ```text
  @types/react@18.3.31
  └─┬ braintrust@3.33.0
    ├── @agentskit/eval (devDependencies)
    └── @agentskit/eval-braintrust (devDependencies)
  ```

  React 19.2.17 remains declared by docs-next and React workspace consumers.
  The before/after tree diff contains exactly one removed line:
  `├── agentskit@0.3.0 (devDependencies)` under React 19; all other paths match.
- A clean manifest-only install (all workspace package manifests, root lockfile,
  workspace config and reverted .npmrc) using `pnpm install --offline
  --frozen-lockfile --ignore-scripts` exits 0 and selects private-hoisted React
  19.2.17. Root `node_modules/@types/react` is absent. The existing worktree
  reinstallation selects the same version and docs-next type-check passes.
  Thus no memory-origin React conflict reproduces on the current locked tree.
- CH-C2 reported an installation that privately hoisted React 18; that old
  installation's hoist map was not retained. Its exact historical selection
  cause is **partially validated**, not reconstructed or attributed to Drizzle.
  The evidence establishes the React 18 dependency origin and validates that
  the current source needs no global or package-local React workaround.

## Evidence binding

Starting revision: `1d0fc5b9d3c73e70c1fa54456cf057db4f725d06`.
Implementation input SHA-256 (ordered path, NUL, bytes, NUL for `.npmrc`,
`package.json`, `pnpm-lock.yaml`, `packages/memory/package.json`):
`4741232b735738502a3628458899b06cbd5e42cc64036942a49ed9944a1f90b8`. Implementation commit: `7a665a8d`. Later report/index commits do not alter
those inputs; their exact commit is included in the worker receipt.

## Criterion results

| ID | Criterion | Evidence | Current result |
|---|---|---|---|
| C1 | No global workaround; minimal lock | diff: .npmrc -2, root manifest -1, lock -3; frozen offline install exit 0 | validated |
| C2 | Memory metadata and dependency origin | installed manifests; package-local why; recursive tree diff; clean offline installation React 19.2.17 | validated current resolution; historical hoist choice partially validated |
| C3 | docs-next type-check and build | direct tsc --noEmit exit 0; forced Turbo build --filter=@agentskit/docs-next --only --force --concurrency=2: 1/1 success, zero cached; Next TypeScript passed, 518 pages generated | validated with real build |
| C4 | memory build/test (242) | package test with AK_POSTGRES_TEST_PORT=55440 and VITEST_MAX_WORKERS=1: 33 files / 242 passed; package lint exit 0 | validated |
| C5 | Ratchets | cross-platform 148, core 75, net 111 baseline findings, no new issues | validated |
| C6 | pnpm test | VITEST_MAX_WORKERS=1 pnpm test: 77/77 tasks, 77 cached | validated cached test evidence; memory separately executed |
| C7 | check:quality-gates | VITEST_MAX_WORKERS=1 TURBO_CONCURRENCY=2 pnpm check:quality-gates, built-in Turbo concurrency 2: all 52 gates passed on rerun, exit 0 | validated |
| C8 | doc-bridge freshness | index regeneration and standalone freshness, exit 0; regenerate once more with this final report before committing | validated; final-index check required before receipt |
| C9 | local commits and task-owned cleanup | repair commit 7a665a8d; isolated install removed; docker rm --force ak-ch-c3-postgres exit 0; final diff/status and evidence commit | validated; final commit recorded in receipt |

## Attempts and limits

The initial memory run without a database skipped one test (241 passed, 1
skipped). The first database attempt hit PostgreSQL container startup and
failed at its initial query; after pg_isready confirmed readiness the full
242-test run passed. No application code was changed for the startup race.

An initial direct docs build invoked the documented prebuild's recursive
package builds outside Turbo's explicit concurrency budget. Its generator
then encountered low disk space during the isolated install; that attempt was
stopped using only its own process tree and is **not accepted build evidence**.
Task-owned temporary dependency files were removed to reclaim disk; the
accepted build command is the forced Turbo concurrency-2 run stated above.
The prior 15-task fully cached build did not restore the generated memory/rag
API pages removed by the interrupted generator. The forced build regenerated
all API pages and completed Next compilation, TypeScript and 518 static pages.
The global Turbo output configuration does not cover these generated docs
outputs; this report uses the real build rather than treating cache replay
as proof of the current artifact. Global Turbo configuration was not changed.

Not analyzed: changes to braintrust/eval, React UI behavior, historical module
layout not retained by CH-C2. Not applicable: deployment, publication, external
accounts, new public behavior, changeset, contract ADR and human visual review.
No statement here establishes broader enterprise readiness. Required next
human action: coordinator review of this evidence and final diff.

The initial quality-gate run finished with 51 of 52 gates passing; verified
recipe factory failed because its doc-bridge index-freshness check preceded
the index regeneration. No structural/application check failed. The index
was regenerated and the complete command rerun: all 52 gates passed. Container
cleanup briefly failed because the Docker socket disappeared; escalation and
a coordinator question were sent. After the socket returned, removal of only
`ak-ch-c3-postgres` succeeded; the coordinator was told the question was obsolete
and its local waiting process was stopped. No unrelated container was touched.

Final classification: **validated** C1 and the current-resolution part of C2,
C3–C9; **partially validated** historical CH-C2 hoist selection; **blocked**
none; **not analyzed** and **not applicable** are listed above. The task is
submitted for coordinator evidence review, not self-approved or parent-complete.
Task-owned raw temporary logs are removed after their outcomes are recorded
here; build outputs remain as the real artifact.
