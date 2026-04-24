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

| Package | Tier | Rationale |
|---|---|---|
| `@agentskit/core` | `stable` | Sacred package. Contract-stable per ADRs 0001–0006 |
| `@agentskit/adapters` | `beta` | Adapter contract is stable; provider coverage and helper APIs are still settling |
| `@agentskit/runtime` | `beta` | ReAct loop is solid; topology and durable APIs are still evolving |
| `@agentskit/tools` | `beta` | Core tools are usable in production; integrations and MCP ergonomics are still evolving |
| `@agentskit/memory` | `beta` | Main backends are working; vector-store surface is still sharpening |
| `@agentskit/skills` | `beta` | Skill contract is proven; marketplace resolver and persona catalog are still growing |
| `@agentskit/observability` | `beta` | Observer contract stable; integration coverage growing |
| `@agentskit/react` | `beta` | Production-ready, but the shared `ChatReturn` surface is still tracked toward 1.0 |
| `@agentskit/ink` | `beta` | Terminal UI is strong; parity and keyboard UX are still being refined |
| `@agentskit/cli` | `beta` | Core commands are useful now; template gallery and doctor autofixes are still expanding |
| `@agentskit/rag` | `alpha` | Retrieval pipeline is promising, but chunking and reranking defaults are still moving |
| `@agentskit/eval` | `alpha` | Replay and suite concepts are in place; formats and reporters are not frozen yet |
| `@agentskit/sandbox` | `alpha` | E2B works; fallback and policy APIs are still maturing |
| `@agentskit/vue` | `alpha` | Early framework binding, still closing parity with React |
| `@agentskit/svelte` | `alpha` | Early framework binding, still closing parity with React |
| `@agentskit/solid` | `alpha` | Early framework binding, still closing parity with React |
| `@agentskit/react-native` | `alpha` | Early mobile binding, still building platform depth |
| `@agentskit/angular` | `alpha` | Early Angular binding, still shaping the final Signals + RxJS surface |
| `@agentskit/templates` | `alpha` | Useful authoring toolkit, but scaffolding surface is still expanding |

## Until v1.0.0

AgentsKit is pre-1.0 at the project level while every package is tier-declared individually. That is intentional: the **substrate** (core + the six ADR contracts) has stable semantics today, and we want to mark the packages implementing them honestly — but the project as a whole hasn't yet passed the version-1 commitment threshold (long-running public use, external contributors in steady state, stabilized CI gates).

Reaching v1.0.0 means:

- All six core contracts have at least one external consumer outside our repo
- The CI gates (bundle size, coverage) have held for two full sprints without regression
- A public commitment to the semver discipline above is documented and honored

## How to change a tier

- **`alpha` → `beta`**: open a PR that updates `package.json.agentskit.stability`, the README badge, and explains in the PR what changed to earn the bump. No RFC needed.
- **`beta` → `stable`**: requires an RFC and at least one minor release where the package operated at beta without breaking changes. The RFC documents the public API surface being committed to.
- **`stable` → `beta`** or lower: requires an RFC and a major version bump of the package. Do not demote a stable package lightly.

## How consumers should read this

If a package is `stable`, pin it with `^x.y.z` and trust the minor-bump contract. If it's `beta`, use `~x.y.z` if you're conservative, or accept minor bumps may break you. If it's `alpha`, pin exact and read the changelog on every update.

## References

- This policy lives at `/docs/STABILITY.md`
- Cross-referenced from the [Manifesto](../MANIFESTO.md) (principle 1 — "the core is a promise") and from every package README badge
- Related ADRs: 0001 Adapter, 0002 Tool, 0003 Memory, 0004 Retriever, 0005 Skill, 0006 Runtime
