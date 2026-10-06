# CH-E — durable core confirmations and controller parts

Date: 2026-10-06. Base: `0e1c1aa92e69f29f41241e49753ecab8ae279119` (local origin/main). Implementation is additive in core 1.x; the minor changeset is pending release. No push, PR, release, publication, real account, or remote database is authorized.

## Task contract

Intent: implement the approved compatible API, verify it locally, commit locally, and report for coordinator/human evidence review. Scope: core controller/types/persistence, synthetic tests, ADR 0041, core human/agent documentation, and a minor changeset. Adapters, memory package backends, HTTP protocol/server handlers, transport streams, database services, and UI are outside this worker's scope. Required human decision: review the implementation/evidence; this worker cannot approve itself.

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
