# PostgreSQL ChatMemory task contract and validation

Intent: implement the existing public ChatMemory contract with BYO Drizzle/pg,
without changing Core contracts. Authorized scope: packages/memory, corresponding
docs/changeset, and pnpm-lock.yaml (coordinator explicitly approved lock changes).
SessionStorage CAS/leases are owned by another task and excluded by coordinator
confirmation. No adapters/core edits, push, PR, release, deployment, real accounts,
or private consumer details. Local commit required; coordinator reviews output.

Validation budget: local package checks, one disposable PostgreSQL 16 Docker
container, local wrangler/workerd, registry downloads for required optional peers
and dev tools. No CI or external database fixtures. Remove task-owned container
and temporary workerd state; preserve existing files. State: BLOCKED (doc-bridge), pending coordinator evidence review.

| Criterion | Required evidence | Status |
|---|---|---|
| C1: isolated public subpath/schema/SQL | package build, ESM/CJS imports; migration executed on PG16 | validated: see evidence below |
| C2: CM1–CM6/parts/dates/atomic replace | shared real Postgres contract suite on current sources | validated: see evidence below |
| C3: tenant/session isolation | shared suite tests read/write/clear across both keys | validated: see evidence below |
| C4: explicit history policy and signal | shared suite retention/invalid config/abort; README documents in-flight boundary | validated: see evidence below |
| C5: Node Pool and Workers Client | same suite via Pool and real wrangler dev HTTP with Client/waitUntil | validated: see evidence below |
| C6: package build/lint/test | documented package commands | validated: see evidence below |
| C7: docs/changeset and handoff | current diff, confidentiality scan, local commit, coordinator review | partially validated: artifacts present; coordinator review pending |
| G1: doc bridge handoff/gate | documented query/gate commands | blocked: invalid config analysis.areas |

RF-12 ChatMemory portion and RF-13/16 map to C1–C5. RF-12 SessionStorage,
RF-14 CAS and RF-15 lease are not analyzed here and explicitly out of scope.
Neon/Hyperdrive, deployment, UI and production performance are not applicable
for this local ChatMemory contract. RLS example is documentation; database role
policy behavior is not validated by the suite.

Environment blockers: `ORCA_PLAYBOOK.md` absent in this worktree; no agents were
dispatched or resumed by this worker. `pnpm exec ak-docs query package memory
--agent` rejected configuration: `analysis: Unrecognized key: "areas"`.
Harness configuration remains unchanged per coordinator instruction.

## Current evidence (2026-10-06)

Base revision: `0e1c1aa92e69f29f41241e49753ecab8ae279119`.
Implementation/config/test/lock digest (paths ordered as recorded below):
`069ee90942dcc4d00754f37455eac4950cedc32e29e505617c7303d885c1b97b`.

Digest paths: `packages/memory/src/postgres.ts`, `packages/memory/package.json`, `packages/memory/tsup.config.ts`, `packages/memory/tests/postgres-contract.ts`, `packages/memory/tests/postgres.integration.test.ts`, `packages/memory/tests/postgres-worker.ts`, `packages/memory/tests/postgres-workerd.mjs`, `packages/memory/tests/wrangler.postgres.jsonc`, `pnpm-lock.yaml`.

- C1: ESM and CJS exports imported successfully; the exported SQL created the real PostgreSQL 16 table in both acceptance runners. `src/index.ts` unchanged; Drizzle/pg remain external and optional.
- C2/C3/C4: `AK_POSTGRES_TEST_PORT=55439 pnpm --filter @agentskit/memory test` passed 33 files / 242 tests; the shared suite checks CM1–CM6, independent snapshots, full parts/tools/metadata/date roundtrip, tenant/session read/write/clear isolation, complete concurrent snapshots, empty replacement, newest-N retention, invalid options/records, aborted mutations and recovery.
- C5: Node Pool suite passed against server version 16; real local wrangler dev HTTP returned 200 with every shared contract result passing, using pg.Client per request and waitUntil(client.end()). Final fixture imports the compiled public subpath, not source.
- C6: package build (tsup ESM/CJS/declarations via documented test build chain) and lint passed. `test:coverage` passed 33 files / 242 tests with 93.45% lines overall and 95% lines / 100% branches in postgres.ts (90% package threshold). Standalone fixture strict typecheck passed with TypeScript 6 `--ignoreConfig`.
- Supporting size evidence: local `size-limit packages/memory/dist/index.js --limit "16 KB" --json` passed at 13,406 bytes; the postgres.js file check passed at 796 bytes. These are narrow file checks, not the full repository size/subpath-closure gate or production latency evidence.
- G1 blocked: package handoff rejects `analysis.areas`; `docs:bridge:gate` failed to return after eight minutes and was terminated. pnpm subsequently attempted automatic dependency repair; that task-owned process was terminated too. No harness/config changes were made.

Validated: C1–C6 local executable artifact behavior. Partially validated: C7 local artifacts/commit ready, pending coordinator review. Not analyzed: SessionStorage CAS/lease, production deployments/performance, RLS role enforcement. Blocked: doc-bridge handoff/gate. Not applicable: UI/browser/visual approval, Neon/Cloudflare accounts, external publication.

No structural contract decision was introduced: this backend implements ADR 0003 using the existing versioned Core record and validator. No ADR/guardrail was changed. The only default-export exception is Wrangler’s required module entry in the test fixture; public package exports remain named.

Final reconciliation: current implementation digest rechecked; confidentiality/attribution scan and `git diff --check` passed. Task-owned PostgreSQL container removed; workerd runner removed its temporary persistence directories and exited. Build/declaration and coverage outputs remain local ignored verification artifacts. Local commit includes this report; no push, PR, release, external message, or published artifact was created. Next action: coordinator reviews the diff/evidence and resolves the blocked doc-bridge environment before approving overall completion.


## CH-C2 guardrail repair (2026-10-06)

Contract: **fix** the branch's actual validation failures. Authorized scope is
memory's acceptance runner and public API documentation, workspace dependency
resolution, the existing size/API/freshness records, generated backend-count
artifacts, this report and doc-bridge projections. Core contracts, dependency
versions outside this repair, guardrail rules/allowlists, other repositories,
push/PR/release and unrelated processes are excluded. Acceptance requires green
net ratchet and docs typecheck, the requested sequential package/docs/global
checks, real execution of the changed runner, and local commits with evidence
reported to the coordinator. Goal approval is the CH-C2 dispatch; parent evidence
approval remains with the coordinator. No new structural contract or ADR.

Budget: offline cached dependency installation, Turbo concurrency 2,
VITEST_MAX_WORKERS=1, one task-owned trust-auth PostgreSQL 16 container and local
workerd. No CI, remote database, publication or credentials. A task-owned isolated
local clone at clean main revision `0e1c1aa92e69f29f41241e49753ecab8ae279119`
was used to compare failures; the shared temporary baseline disappeared during
an earlier attempt, so those interrupted results were discarded.

Fixes:

- Replace handwritten fetch retry and unbounded JSON parsing with existing net
  retry/readJson helpers; cap the acceptance response at 4096 bytes. Use the
  existing cross-platform spawnProcess helper and process-tree cleanup, adding
  it only as memory's workspace dev dependency. No ratchet rule was suppressed.
- Both branches' lockfiles already contain React types 18 and 19. The failing
  installation selected private-hoisted React 18 for dependencies without an
  explicit types peer, while clean main selected 19. Exclude React types from
  private hoisting and provide the existing 19.2.17 version at the root for
  fallback resolution. Frozen offline reinstallation succeeds; lock changes
  add only root React types and the local workspace dev dependency, six lines.
  No React UI types/components or unrelated dependency versions were changed.
- Register the existing PostgreSQL subpath in the API snapshot and size targets,
  document its three previously undocumented exports, and regenerate the
  existing ledger/snapshots from 18 to 19 backends. Refresh affected source hashes
  with review dates preserved; no human approval or attestation was manufactured.

Current implementation/evidence revision: `713bb679` (repair `aaaa175a`, derived
artifact synchronization `713bb679`). SHA-256 of ordered inputs `.npmrc`,
`package.json`, `pnpm-lock.yaml`, `packages/memory/package.json`,
`packages/memory/src/postgres.ts`, `packages/memory/tests/postgres-workerd.mjs`,
`.size-limit.json`, `docs/stability/public-api-v1.json`,
`readme-standard-v1.json`, `ecosystem-claims.json` (path, NUL, bytes, NUL):
`9defc8b67a3abe1622c2685822c6ce44647fdb038db9925ca9ddc519c4dd3888`.
The final report/index commit does not change these implementation inputs.

| Criterion | Executed evidence on current inputs | Result |
|---|---|---|
| N1 approved net helpers, no ratchet growth | `node scripts/check-net-rules.mjs`; global cross-platform/net gates | validated: zero new findings; baselines/rules unchanged |
| N2 dependency resolution and docs types | frozen offline install; `pnpm --filter @agentskit/docs-next exec tsc --noEmit` | validated: exit 0, no React type edits or unrelated version updates |
| N3 memory build/test and runner | package build/test; `AK_POSTGRES_TEST_PORT=55439 pnpm --filter @agentskit/memory test:workerd` | validated: 33 files / 242 tests; real workerd+PG CM1–CM6, isolation, parts, retention, abort and recovery passed |
| N4 docs build | `pnpm exec turbo run build --filter=@agentskit/docs-next --concurrency=2` | validated: 15/15 tasks, 14 cached; exit 0 |
| N5 global tests | `AK_POSTGRES_TEST_PORT=55439 VITEST_MAX_WORKERS=1 pnpm test` | validated: 77/77 tasks, 72 cached; exit 0; cached tasks are explicitly included |
| N6 quality gates | `VITEST_MAX_WORKERS=1 pnpm check:quality-gates` | validated: all 52 gates passed; initial seven failures were repaired |
| N7 doc-bridge after lock/report | regenerate index, then standalone `pnpm docs:bridge:gate` | validated: standalone gate exit 0 after report/index regeneration; index freshness, 27 human-doc links and documentation conformance pass |
| N8 local commits, scope and cleanup | final diff/status and task-owned resource reconciliation | validated local repair/docs commits and diff; final report/index commit in worker receipt; coordinator review pending |

Clean-main comparison: API JSDoc and size-target checks passed before the shared
baseline disappeared. The owned isolated main passed README Standard, its tests
and cross-platform ratchet. Its doc-quality certification test reproduced the
`doc-bridge-live` doctor failure (19 passed / 1 failed, clean source verified);
its unchanged doc-bridge index was stale in the recipe gate. Missing build
outputs in that isolated recipe setup were environmental and were not presented
as source regressions. In CH-C2, regeneration repaired the live/index failures:
all 52 quality gates now pass, so no remaining global-gate failure is being
classified as pre-existing or waived.

Validated: N1–N7 executable results, including real changed runner behavior.
Partially validated: N8 parent review;
derived numeric documentation content has build and deterministic-answer test
evidence, without a claimed browser/visual review. Not analyzed: browser
interaction, responsive layout, accessibility, contrast/overflow and visual
approval for generated count surfaces; production performance, RLS, CAS/leases
and deployed runtimes. Blocked: no remaining executed global gate; any required
visual/human evidence remains for coordinator review. Not applicable: changes to
UI components/styles, external deployment/publication, credentials or CI.
State: AWAITING_HUMAN_APPROVAL for parent evidence review; this worker does not
approve its output or declare the parent feature complete.

Task-owned PostgreSQL container was removed after the real runner passed; the
runner removed its temporary persistence state and awaited its own process tree.
The isolated baseline and task-owned logs are removed in final reconciliation.
Ignored build/declaration/cache outputs remain local. No unrelated process was
terminated, no push/PR/release occurred, and no agent attribution was added.
Next human action: coordinator reviews the commits/evidence and determines any
required visual review before parent completion.

## CH-C3 follow-up

The global React type workaround described in the CH-C2 section above is
removed by CH-C3. See [current resolution evidence](./memory-react-resolution-ch-c3.md)
for the dependency-origin investigation, minimal lockfile diff and current checks.
The CH-C2 section remains a historical record of its own revision.

## AK-1827 review follow-up (2026-10-07)

Contract: fix C1–C4 in this worktree, merge current origin/main, create local
commits and report to the Orca coordinator; no push or external publication.
Scope: memory implementation/tests/docs/changeset, CI workflow and generated
Doc Bridge/README/ecosystem projections. Core is validated after the merge,
without additional contract changes. Goal approval is the task dispatch;
coordinator evidence review remains required. No new structural decision.
Budget: frozen cached installation, one task-owned PostgreSQL 16 container,
one npm registry tarball for Drizzle compatibility, local workerd, Turbo <=2
and Vitest <=2. No credentials, remote CI execution or unrelated cleanup.

Merged main input: `bbd4d97404826f28eb685f74dba570eadcbeed3f`.
Current implementation input SHA-256 (ordered path, NUL, bytes, NUL):
`39e576744a709defeb167af79b6d7059db34080fca1835f0d347cd0c042aaac2`.
Paths: `packages/memory/src/postgres.ts`,
`packages/memory/tests/postgres-contract.ts`, `packages/memory/package.json`,
`.github/workflows/ci.yml`, `pnpm-lock.yaml`.

| Criterion | Current evidence | Status |
|---|---|---|
| C1 merge main, preserve both sides, regenerate conflicts | Only generated index/capabilities/README conflicts; scripts regenerated them; README/ecosystem hashes identical on repeated generation; core 39 files/562 tests and package typechecks passed | validated locally; merge commit recorded in worker receipt |
| C2 retained history never starts inside tool group | Real PG16 suite tests cutoffs N=1–5 across two parallel calls/results and a tool-only suffix; memory 33 files/242 tests passed; shared suite also passed via real local workerd | validated |
| C3 snapshot comment and peer compatibility | Comment says replace-all snapshot; Drizzle 0.44.0 package typecheck and real PG contract passed, as did configured 0.45.3; optional peer widened to `^0.44.0 || ^0.45.3`; frozen install passed | validated |
| C4 required CI PG16 service without secrets | YAML parsed; assertions for Ubuntu/service/trust/port/command/quality dependency/no secrets passed; exact package command ran on real PG16 locally | validated configuration and local acceptance; hosted CI execution not performed |
| G1 affected package tests/typecheck/lint | memory 242/core 562 tests passed; both documented lint commands (tsc) passed; shared fixture separate strict typecheck passed | validated |
| G2 Doc Bridge 1.12 | `pnpm exec ak-docs --version` returned 1.12.0; package handoff succeeded; `pnpm exec ak-docs gate run` passed index-freshness, human-guide-links, documentation-standard-v1 after workerd temp cleanup | validated; final report-only update is regenerated and checked before commit |
| G3 full pre-push under resource floors | `TURBO_CONCURRENCY=2 VITEST_MAX_WORKERS=2 sh .husky/pre-push`, CI unset; monitor sampled memory/swap every 10s and terminated only its own process group below the floor | validated fourth attempt: exit 0; prior attempts discarded (see reconciliation below) |

Discarded evidence: first retention fixture incorrectly expected explicit
undefined properties after JSON roundtrip; fixed fixture and reran the full
memory suite. A Doc Bridge run raced workerd temporary bundle removal; removed
task-owned empty `.wrangler` directories and regenerated/reran successfully.
Neither failed attempt is represented as a passing final gate.

Validated: C1–C4 local criteria and G1–G3; final report-only update receives a fresh G2 run.
Partially validated: hosted CI execution and parent evidence review.
Not analyzed: production performance/deployment, RLS enforcement, CAS/leases,
unrelated product/UI behavior. Blocked: none after the fourth hook passed.
Not applicable: new UI components/styles, browser visual approval, external
publication, secrets or new architecture/contracts.
State: AWAITING_HUMAN_APPROVAL for coordinator evidence review. Historical
evidence above describes its own revisions only.

Coordinator authorization via Orca ask reply: retry the full hook with swap
free >=200 MB and memory free >=25%, keeping Turbo/Vitest <=2. This explicitly
changes the original 500 MB floor; previous interrupted attempts remain failed.

Third full-hook attempt respected the revised resource floors but failed the
verified-recipe gate because its Doc Bridge subprocess ran before concurrent
index regeneration finished. The subsequent standalone Doc Bridge gate passed
all three criteria on the updated report. Fourth attempt must run only after
report/index generation completes, with no concurrent source changes.
The pnpm-normalized merged lockfile is semantically identical to the automatic
merge for every importer, package and snapshot; only ordering changed.


Final reconciliation (2026-10-08): fourth full pre-push exited 0 with all 52
quality gates, 60/60 lint tasks and 44/44 build tasks passing. These include
cached tasks (package declaration precondition: 27/27 cached); they are not a
claim that every repository test or UI acceptance flow ran. Turbo concurrency
was 2 and Vitest workers 1, with CI unset. Ten-second resource samples had
minima 28% memory free and 328.25 MB swap free: valid against the coordinator's
revised 200 MB floor, not the original 500 MB requirement. No other process
was terminated. Prior interrupted/stale-index attempts remain discarded.

The implementation input digest above is unchanged. After the passing hook,
only this evidence report changes; its required Doc Bridge freshness/link/
conformance checks are regenerated and rerun before commit. Build-created
tracked deterministic-knowledge outputs were restored from the index and the
single new content-addressed artifact removed. The task-owned PG16 container,
Drizzle tarball/extraction and temporary logs are removed; standard ignored
build/dependency caches remain for the coordinator. No push or hosted CI run.
Final diff/status and main ancestry are checked after the local merge commit;
its SHA is supplied in the worker receipt. Next human action: coordinator
reviews the evidence/diff and performs the authorized push, which runs CI.
