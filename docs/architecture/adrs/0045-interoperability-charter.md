# ADR 0045 — Interoperability charter

- **Status**: Proposed
- **Date**: 2026-10-29
- **Supersedes**: —
- **Related issues**: #1477, #1890
- **Related ADRs**: 0001–0006 (contracts), 0009, 0012, 0013, 0020, 0025, 0028, 0041

## Context

"Interoperability is mandatory" is a vital rule, but the supporting rules are
spread over several ADRs: composition (0009), vendor adapter scope (0012),
serializable state (0020), public API and the compatibility matrix (0025), MCP
beta boundaries (0028) and content serialization (0041).
`scripts/check-core-no-deps.mjs` only inspects the `dependencies` block of
`@agentskit/core`. This ADR is the canonical document that joins those rules
into one verifiable promise. Later interop work uses it as the rule set.

## Decision

### 1. Dependency direction

- Packages form layers rooted at `@agentskit/core` (see ADR 0009 for the graph).
  A package may depend on `core` and on declared peers, never on a sibling's
  internals.
- `@agentskit/core` imports no other `@agentskit/*` package.
- No dependency cycles, within or across packages.

### 2. Stable contracts

The six contracts (Adapter, Tool, Memory, Retriever, Skill, Runtime; ADRs
0001–0006) are the interoperability surface. Their tier and change rules are
those of [`docs/STABILITY.md`](../../STABILITY.md) and ADR 0025. This charter
does not promote or demote any tier.

### 3. Optional bridges

- Recipe first: a documented recipe that composes existing packages through the
  contracts is the default way to bridge to another ecosystem.
- A package named `@agentskit/interop-<target>` is created only with a real use
  case and an executable test. It depends on `core` and the target, never the
  reverse (ADR 0009, ADR 0012).

### 4. External standards and vendor extensions

- MCP, A2A, AG-UI, JSON Schema and OpenAPI are treated as external standards:
  we map to them at the edge (adapters, tools, bridge packages); we do not copy
  their types into `core` or let them reshape a contract. JSON Schema remains
  the canonical schema format. MCP follows ADR 0028.
- Vendor-specific features are reachable only through an explicit escape hatch
  (adapter-local option or namespaced extension field). They never alter a core
  type, and portable code must not depend on them (ADR 0012).

### 5. Data portability and versioning

Data that crosses a package, process or version boundary is plain, serializable
and versioned:

| Data | Rule |
|---|---|
| Messages, tool calls | Ordered content parts are authoritative; serialized at the provider boundary (ADR 0041) |
| Memory records | Validated at runtime on load (ADR 0013) |
| Stream events, interaction state | JSON-serializable, no live handles (ADR 0020) |
| Traces | Serializable events; observers never affect results |
| Eval results | Versioned record per [`docs/spec/eval-result-record-v1.md`](../../spec/eval-result-record-v1.md) |

A breaking change to a persisted shape needs a version bump and a migration or
explicit rejection, never silent reinterpretation.

### 6. What never enters `@agentskit/core`

No runtime dependency enters core, and no I/O, network or vendor SDK. The
allowlist of imports in core source is:

- relative imports and subpaths of core itself;
- `json-schema`, only as `import type`;
- `canonicalize` and `@noble/hashes`.

Confirmed against `packages/core/tsup.config.ts`: `canonicalize` and
`@noble/hashes` are declared in `devDependencies` and bundled through
`noExternal`, so the published package keeps zero runtime dependencies. Core
stays under 10 KB gzipped (ADR 0009). Adding to this allowlist requires a new
ADR.

### 7. Status vocabulary

Every interoperability claim carries exactly one status, the same set the
Registry uses (`docs/studies/registry-runner-projections-plan.md`):

- `verified`: an executable test proves it.
- `partial`: works with documented limits.
- `planned`: intended, not a support claim.
- `unsupported`: known not to work.

### 8. No claim without evidence

No document, README or registry entry may claim interoperability without an
executable test, or an explicitly marked limitation (`partial`, `planned` or
`unsupported`). Unknown means `planned`, not `verified`.

### 9. AgentsKit Chat

AgentsKit Chat is a reference UI and optional. No package may require it, and
no contract may be shaped by it alone.

## Consequences

- One citable rulebook for follow-up sub-issues of #1477.
- Documentation only: no package code, export or public API changes.
- Mechanical enforcement of sections 1, 6 and 8 (import allowlist, cycle and
  claim checks) is future work; until then review applies them.
