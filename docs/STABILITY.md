# Stability policy

Every AgentsKit package declares a **stability tier** in its `package.json` under the `agentskit` field:

```json
{
  "name": "@agentskit/core",
  "agentskit": {
    "stability": "stable",
    "stabilityNote": "Sacred package. Contract-stable per ADRs 0001-0006."
  }
}
```

Each package's `README.md` displays a corresponding badge at the top.

## The three tiers

### `stable`

> Safe for production. Breaking changes require a major version bump and a deprecation cycle.

- **API is frozen at the minor level** — we will not break public exports in a minor or patch release
- **Contracts are pinned to ADRs** — any contract change needs a new ADR and coordinated major bump of all affected packages
- **Deprecation path required** — a deprecated API remains available for at least one minor release before removal
- **Changesets describe every user-facing change** explicitly

### `beta`

> Usable in production, but expect some rough edges and occasional breaking changes between minor versions.

- Public API shape may still be adjusted as real usage teaches us
- **Breaking changes land in minor bumps** with migration notes in the CHANGELOG (not a major bump — that's reserved for `stable` contracts)
- Contracts derived from ADRs are respected; conveniences and helpers around them are still evolving
- Semver-within-tier: within `0.x`, a minor bump can break beta packages; a patch bump cannot

### `alpha`

> Early, promising, and still moving. Expect API changes as the package sharpens.

- Anything may change in any release — including removal
- No deprecation guarantees
- Useful for exploring a design before committing to a contract
- A package stays alpha until it either graduates to `beta` or is removed

## Current tier map

This table is the single source of truth. A gate (`check-stability-tier`) asserts
every package's `package.json` tier matches its row here, and `check-readme-badge`
asserts each README badge matches too — so this table, the package metadata, and
the badges can never drift apart.

| Package | Tier | Rationale |
|---|---|---|
| `@agentskit/core` | `stable` | Sacred package. Contract-stable per ADRs 0001–0006; the only package past v1.0 |
| `@agentskit/adapters` | `beta` | Contract/resilience hardening complete; promotion still awaits ≥90 beta days, two distinct released minor lines, Accepted RFC/evidence, and 1.0.0 |
| `@agentskit/runtime` | `beta` | ReAct loop is solid; topology and durable APIs settling toward an RFC freeze |
| `@agentskit/tools` | `beta` | Core tools usable in production; integrations and MCP ergonomics still evolving |
| `@agentskit/memory` | `beta` | Main backends working; vector-store surface sharpening toward freeze |
| `@agentskit/skills` | `beta` | Contract/catalog/registry hardening complete; the 0.9 breaking beta line restarts the ≥90-day clock, and promotion still needs a second released minor line, Accepted RFC/evidence, and 1.0.0 |
| `@agentskit/observability` | `beta` | Lifecycle / cost-guard / provider-resilience hardening complete; stable promotion still awaits publishing this breaking/additive beta minor as appropriate, clean ≥90-day soak, two distinct released minor lines, Accepted RFC/evidence, and 1.0.0 |
| `@agentskit/react` | `beta` | Production-ready; the shared `ChatReturn` surface is still tracked toward 1.0 |
| `@agentskit/ink` | `beta` | Terminal UI strong; parity and keyboard UX still being refined |
| `@agentskit/cli` | `beta` | Core commands useful now; programmatic surface large and still settling |
| `@agentskit/rag` | `beta` | Retriever/loaders/resilience hardening complete; the next minor restarts the ≥90-day clock, and promotion still needs a second released minor line, Accepted RFC/evidence, and 1.0.0 |
| `@agentskit/eval` | `beta` | Suite/replay/snapshot/CI/Braintrust hardening complete; stable promotion still awaits publication, soak, two released minor lines, Accepted RFC/evidence, stable dependencies, and 1.0.0 |
| `@agentskit/sandbox` | `beta` | Lifecycle/config/runtime hardening complete; promotion still awaits publish, ≥90 beta days, two released minor lines, Accepted RFC 0013/evidence, and 1.0.0 |
| `@agentskit/templates` | `beta` | Scaffold/validation hardening complete; promotion still awaits publish, soak, two released minor lines, Accepted RFC 0014/evidence, and 1.0.0 |
| `@agentskit/validation` | `beta` | Private implementation hardened behind `@agentskit/tools/validation`; it does not graduate independently from the public tools surface (ADR-0008, RFC 0015) |
| `@agentskit/statechart` | `beta` | Deterministic transitions, total unknown-snapshot restore, hostile JSON/key handling, synchronous observer isolation, packaging, and adversarial coverage hardened (ADR-0020, ADR-0027) |
| `@agentskit/eval-braintrust` | `beta` | Private implementation exposed through `@agentskit/eval/braintrust`; awaited SDK lifecycle and score validation complete, but it graduates with the public eval surface |
| `@agentskit/observability-langfuse` | `beta` | Private workspace implementation exposed through `@agentskit/observability/langfuse`; Langfuse SDK peer-resolved at runtime |
| `@agentskit/integrations` | `beta` | Descriptor/registry/projection contract shipped; 50-service fetch-only catalog; auth/actions/triggers/testing; packed API gates; execution boundaries explicit (ADR-0026). Not yet stable |
| `@agentskit/mcp` | `beta` | Tool bridge, fail-closed CLI, agent delegation, bounded registry IO, stdio isolation, publication, and adversarial coverage hardened (ADR-0028) |
| `@agentskit/vue` | `beta` | First binding at full headless component parity with React; `useChat` + 7 primitives, 100% component coverage |
| `@agentskit/svelte` | `beta` | At headless component parity with React (Svelte 5 runes); `createChatStore` + 8 components |
| `@agentskit/solid` | `beta` | At headless component parity with React (Solid JSX, `data-ak-*`); `useChat` + 8 components, 100% component coverage |
| `@agentskit/react-native` | `beta` | Headless component parity with React via RN primitives (`testID`-keyed); `useChat` + 8 components, 100% component coverage |
| `@agentskit/angular` | `beta` | Service + 8 headless standalone components at React parity; partial-Ivy AOT/APF (ESM-only) via ng-packagr; Signals + RxJS surface |

## Until v1.0.0

AgentsKit is pre-1.0 at the project level while every package is tier-declared individually. That is intentional: the **substrate** (core + the six ADR contracts) has stable semantics today, and we want to mark the packages implementing them honestly — but the project as a whole hasn't yet passed the version-1 commitment threshold (long-running public use, external contributors in steady state, stabilized CI gates).

Reaching v1.0.0 means:

- All six core contracts have at least one external consumer outside our repo
- The CI gates (bundle size, coverage) have held for two full sprints without regression
- A public commitment to the semver discipline above is documented and honored — see [`SEMVER-COMMITMENT.md`](./SEMVER-COMMITMENT.md)

Progress against these three criteria + cross-framework binding parity is tracked
in [`V1-READINESS-TRACKER.md`](./V1-READINESS-TRACKER.md).

## How to change a tier

- **`alpha` → `beta`**: open a PR that updates `package.json.agentskit.stability`, the README badge, and explains in the PR what changed to earn the bump. No RFC needed.
- **`beta` → `stable`**: requires a dedicated Accepted promotion RFC, at least
  90 consecutive days at beta after the last breaking change, and at least two
  released beta versions from distinct minor lines during that window. Every
  direct internal runtime/optional/peer dependency must already be stable. The
  package must also provide repository evidence for its public API, pack/install
  smoke, functional completeness, resilience, compatibility, sustainability,
  and breaking-change audit. See [ADR 0024](./architecture/adrs/0024-package-graduation-evidence.md)
  and the [evidence schema](./stability/README.md).
  Common API and compatibility evidence follows
  [ADR 0025](./architecture/adrs/0025-public-api-and-compatibility-gates.md):
  declaration snapshots, packed consumers on TypeScript 5.9 and 6.0, blocking
  supported Node LTS lines, and a pre-LTS Node canary.
- **`stable` → `beta`** or lower: requires an RFC and a major version bump of the package. Do not demote a stable package lightly.

## How consumers should read this

If a package is `stable`, pin it with `^x.y.z` and trust the minor-bump contract. If it's `beta`, use `~x.y.z` if you're conservative, or accept minor bumps may break you. If it's `alpha`, pin exact and read the changelog on every update.

## References

- This policy lives at `/docs/STABILITY.md`
- Cross-referenced from the [Manifesto](../MANIFESTO.md) (principle 1 — "the core is a promise") and from every package README badge
- Related ADRs: 0001 Adapter, 0002 Tool, 0003 Memory, 0004 Retriever, 0005 Skill, 0006 Runtime
