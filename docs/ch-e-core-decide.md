# CH-E — durable core confirmations and controller parts

Date: 2026-10-06. Base: `0e1c1aa92e69f29f41241e49753ecab8ae279119` (local origin/main). Implementation is additive in core 1.x; the minor changeset is pending release. No push, PR, release, publication, real account, or remote database is authorized.

## Task contract

Intent: implement the approved compatible API, verify it locally, commit locally, and report for coordinator/human evidence review. Scope: core controller/types/persistence, synthetic tests, ADR 0042, core human/agent documentation, and a minor changeset. Adapters, memory package backends, HTTP protocol/server handlers, transport streams, database services, and UI are outside this worker's scope. Required human decision: review the implementation/evidence; this worker cannot approve itself.

Budget: one frozen-lockfile install; one Vitest worker; core-local lint/build/tests and root-import size checks; local regenerated doc-bridge checks. No CI/network fixtures or new environment. Root `pnpm size` and global lint/test/build include unrelated packages/apps, so validation is deliberately limited to the changed core package and its actual ESM static closure/CJS entry. This does not prove broader integration or readiness.

| Criterion | Evidence method | Result |
| --- | --- | --- |
| C1 durable pending state and resume across controllers | JSON-serialize records, reconstruct controller/store, decide, inspect tool execution and adapter request/results; model-generated pending and memory pending tests; separate-process built-artifact smoke | Validated locally |
| C2 atomic admission | Synthetic linearizable store contract plus 100 rounds × 100 independent-controller decisions; competing approve/deny; insert-if-absent and matching-claim settlement | Validated for the port and synthetic store; real database integration not analyzed |
| C3 terminal replay, errors, and failure recovery | Replay performs no tool/model invocation; failed tool record reaches model; unknown/conflicting decisions typed; failed terminal write remains claimed; pending memory write fails closed | Validated locally |
| C4 additive parts and legacy compatibility | Mixed text/image/file and image-only input survive adapter requests; strings/empty inputs unchanged; existing generation-local approval tests | Validated locally |
| C5 compatibility, packaging, and documentation | Core lint/build, configured coverage, real root closure/CJS gzip budget, built ESM/CJS restart smoke; ADR, minor changeset, public-only diff scan; doc-bridge regenerated gates | Validation evidence below; public API review awaits coordinator/human |
| C6 local commit and cleanup | Final diff/status, no prohibited package changes, task-owned temporary files removed, local commit only | Final reconciliation below |

## Implementation and contract

`ChatConfig.decisionStore` exposes `ToolDecisionStore`: `putPending`, `get`, atomic `claim`, and terminal `settle`. `ToolDecisionRecord` carries the serializable pending message snapshot, identity, decision/status, and terminal `ToolCall` outcome. The application scopes the store to an authorized conversation. `controller.decide(id, 'approve' | 'deny', reason?)` restores the claimed snapshot, runs the existing validation/authorization/execution pipeline, stores the terminal outcome, persists memory, and resumes the model. Prior sibling outcomes are recovered before resuming multi-call turns.

`AK_ACTION_NOT_FOUND` identifies an unknown decision. `AK_ACTION_ALREADY_DECIDED` identifies an in-flight or competing decision. Same-decision terminal replay returns the recorded result, including terminal failure, without another tool/model call. Existing `approve`/`deny` retain their old generation-local behavior and are deprecated. Do not mix legacy and durable decisions for the same call. `send` accepts `ContentPart[]` with existing text projection helpers and retains the string path; framework bindings retain their APIs.

The CAS contract admits at most one execution; it does not promise a distributed transaction with application domain writes. A crash after claim or a failed terminal write stays claimed and requires reconciliation without automatic reexecution. Different calls in one conversation require application serialization for transcript integrity. HTTP event validation/status codes, transport continuation, external confirmation identity mapping, and real Postgres/hosted-database claims are integration acceptance criteria outside this worker's evidence.

## Executed validation

- `pnpm install --frozen-lockfile`: exit 0, pnpm 10.34.4; existing optional build-script warnings and missing bins for unbuilt workspace packages; no dependency/lockfile change.
- `VITEST_MAX_WORKERS=1 pnpm --filter @agentskit/core test:coverage`: 39 files, 546 tests passed, 98.16% configured line coverage. Includes 100 rounds of 100 parallel decisions. Configured coverage includes the new internal decision module; the percentage is supporting evidence, not semantic proof.
- Core `lint` and dual ESM/CJS `build`: executed against the final product source.
- Root import size: repository `scripts/size-core-closure.mjs` bundles the actual ESM static closure; official size-limit with the repository's 10 KB gzip settings checks that closure and the actual CJS entry. Both passed: ESM closure **9729 bytes**, CJS **9826 bytes**, limit **10000 bytes** gzip. No dependency added.
- `node packages/core/tests/controller-restart.mjs`: two independent Node processes, first writes a pending synthetic record and exits, second loads it and approves through the published build; execution occurs once, model receives the tool result, replay calls neither again. Both ESM and CJS consumers are exercised without real services.
- Core public API snapshot: existing repository snapshot helpers regenerated only the core slice, adding the two documented types with no removed exports; a subsequent comparison against the rebuilt declarations passed.
- Structural guards: zero runtime dependencies, no-any, named exports, typed errors, nested ternaries, file size, source/test parity, and ADR index checks passed. The existing tool loop was extracted into controller helpers to respect the pinned controller file limit; decision execution is lazy-loaded to preserve root size.
- Doc-bridge: local pinned 1.12.0, regenerate before query/freshness/gate/conformance as the repository CI does. Stored baseline index was stale initially. The missing `ORCA_PLAYBOOK.md` is the existing documented operational gap; no agent dispatch/resume was performed.

Initial test failure was the default 5 s timeout caused by accumulating independent-round histories in the concurrency test. Each round now uses a fresh fixture, retaining 100 × 100 decisions and one-execution assertions without increasing the timeout. Initial lint caught a missing type-barrel export, corrected before the passing final run. A CLI size invocation without configuration used Brotli by default; it is not the gzip evidence.

## Final reconciliation

Source/test fingerprint: `d08ced1f26aa8eff58b566e412d45b97482438eb9bb1bdd36098e82fe4514543` (sorted core source files, tsup config and controller test artifacts, SHA-256 path/NUL/content/NUL).

Source evidence is tied to the product files in the local implementation commit, based on the revision above. Documentation and report edits do not change product source. Generated doc-bridge index/capabilities are validation artifacts and are restored to the baseline after checks, matching the investigation workflow; CI must regenerate them before the freshness gate. Local caches/dependencies/dist are ignored build artifacts, not shipped changes. Task-owned temporary process fixtures and size configuration are cleaned automatically. Final tracked diff contains only core, its documents, the ADR, changeset, and this report; adapters/memory are untouched.

- **Validated:** C1–C4 and the local core checks in C5; synthetic CAS, restart, replay, parts, and legacy behavior.
- **Partially validated:** C2/C5 integration equivalence; no real database, HTTP/NDJSON, global suite, Linux/Node 22 CI, or release preflight. Doc-bridge results apply to the regenerated validation artifact, not the baseline stored index after restoration.
- **Not analyzed:** other packages, external server/protocol integration, domain-write transactions, real provider support, remote database behavior, global API snapshot validation (the core slice was regenerated and checked).
- **Blocked:** no mapped core flow requires an unavailable external service; broader integration evidence remains with its owners and is not reported as passed.
- **Not applicable:** UI/browser/visual approval, external accounts, release/deployment/publication.

State at handoff: implementation and local verification, **AWAITING_HUMAN_APPROVAL**. Next action: coordinator/human reviews the API, ADR and evidence, runs combined integration acceptance, and decides adoption. No parent-task completion or release approval is claimed.

## CH-E2 — pre-push reconciliation

Approved intent: fix every branch-caused pre-push failure without weakening gates, then commit locally and report. Scope includes downstream binding compatibility, generated freshness artifacts and this note; push, CI, release, external tracking and unrelated baseline defects are excluded. The dispatch specification is the contract; no subagents are used and ORCA_PLAYBOOK.md is absent.

Validation budget: local installed dependencies, Turbo concurrency 2 and one Vitest worker, no CI or real provider calls. E2-01 maps to `pnpm docs:bridge:index` followed by all quality gates; E2-02 maps to repository lint and build; E2-03 maps to final diff/status, local commits, generated-output cleanup and this evidence. Any remaining source failure must be reproduced on clean main `0e1c1aa9` before being classified pre-existing. Coordinator review remains required.

The README standard's core source hash was stale after the README addition. `pnpm readme:standard:refresh -- --preserve-review-dates` updates that single hash without changing rules or review dates. JSDoc (core 263/263), source/test parity, for-agents coverage and ecosystem claims already passed, so no redundant changes were made to them.

Repository lint exposed a branch-caused Svelte wrapper mismatch: its public send type inherits `ChatController['send']`, while the wrapper narrowed input to string. Passing `controller.send` through the existing destroyed-store guard preserves the inherited signature. A store acceptance test exercises parts reaching the adapter and destroyed-store rejection. No rendered component, styling or browser UI changed.

Initial lint failed with Turbo `No space left on device` while replaying/writing logs; it is not source or baseline evidence. The first supplemental public-API snapshot attempt overlapped declaration rebuilding and found missing adapters declarations; the settled-build repeat passed. Current gate reconciliation follows below.

The restart smoke also introduced a cross-platform ratchet violation through direct `child_process`. It now uses the repository's existing built `runCommand` helper without adding any core dependency. Its real ESM/CJS subprocess restart flow and the ratchet both pass. The first quality run failed content-pipeline setup with ENOSPC and live doctor certification after the report/source changed; these results are superseded only by a fresh full run. The first global build overlapped quality-gate recipe dependency rebuilds and temporarily lost net declarations during MCP declaration emission; subsequent validation is sequential.

Svelte checks: client/store 3 files / 22 tests and SSR 1 file / 3 tests passed. Global lint: 60/60 tasks, exit 0. Supplemental public-API check: 19 helper tests and 24 packages / 74 subpaths / 1957 symbols passed. No gate, rule, allowlist or baseline was relaxed.

### Current-source reconciliation

Implementation source: `635f1cd2246bd04dc50270abc9d0bc8899315e87`; commits `baa979fa` (Svelte forwarding, regression, changeset, README hash) and `635f1cd2` (portable restart smoke). Later changes are evidence-only. Run `run_b7f0241f0ec9`, task `task_23303aae1191`, dispatch `ctx_da060ae952c9`.

| Criterion | Status | Current evidence |
| --- | --- | --- |
| E2-01 quality gates, unchanged rules | validated | `VITEST_MAX_WORKERS=1 pnpm docs:bridge:index`, then `VITEST_MAX_WORKERS=1 pnpm check:quality-gates`: all 52 gates passed, exit 0; includes real recipe execution, live doctor, README hash and cross-platform ratchet |
| E2-02 equivalent lint/build | validated | Sequential `VITEST_MAX_WORKERS=1 pnpm lint --concurrency=2 --env-mode=loose` (60/60, zero cache, 1m06s) and `VITEST_MAX_WORKERS=1 pnpm build --concurrency=2 --env-mode=loose` (44/44, 15 cached, 3m32s), exit 0; production docs-next/landing and MCP declaration emission passed |
| E2-03 local delivery and cleanup | implemented; coordinator review remains | Two small local commits above, patch changeset, this note, final diff/status review; temporary index restored exactly as pre-push does, task-generated API route table restored; raw task logs removed after reconciliation |

**Validated:** all mapped local pre-push checks and Svelte/restart regressions. **Partially validated:** earlier overlapping/ENOSPC attempts are historical failed attempts, superseded by the sequential passing run; no Windows execution is claimed by the local portable smoke. **Not analyzed:** whole-repository test suite, live providers/database, browser interactions, CI or production readiness. **Blocked:** none in the local CH-E2 acceptance flow. **Not applicable:** UI rendering/visual approval (store forwarding and process smoke only), release, push, PR and external tracking.

No remaining source failure requires a main exception; clean-main checks were therefore unnecessary and no failure is claimed to be pre-existing. The coordinator freed its own temporary artifacts/Docker build cache after the ENOSPC escalation; this worker neither deleted ambiguous files nor killed another worker's processes. Source revision is unchanged by this final evidence note; its documentation/index checks are repeated before settlement. Stored Doc Bridge outputs remain temporary validation artifacts and the push hook regenerates them before checking. State: **AWAITING_HUMAN_APPROVAL**; next action is coordinator evidence review and the authorized coordinator-owned push.
