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
