# Governance

AgentsKit.js is maintainer-led open source. This document explains who decides what and how.

## Roles

### Maintainer
**Current maintainer:** [Emerson Braun](https://github.com/EmersonBraun).

The maintainer is responsible for:
- Final decisions on roadmap, scope, and architectural direction
- Merging PRs
- Cutting releases
- Curating the public [roadmap board](https://github.com/orgs/AgentsKit-io/projects/1)
- Enforcing the [Manifesto](./MANIFESTO.md) and contracts pinned to ADRs

### Contributor
Anyone who opens an issue, discussion, or PR. No formal barrier to entry. Good contributions compound: repeated high-quality PRs earn triage access and eventually merge rights.

### Collaborator (future)
When the contributor base warrants it, additional maintainers will be added via invitation. Criteria:
- Sustained, high-quality contribution history
- Demonstrated understanding of the Manifesto + ADR contracts
- Agreement with the scope discipline (no scope creep, no "while I'm here" refactors)

## Decision-making

### Small changes (bug fixes, docs, new adapters/tools/skills that fit existing contracts)
- Open a PR, passes CI + review, merged.

### Medium changes (new packages, new examples, non-contract features)
- Open a [Discussion](https://github.com/AgentsKit-io/agentskit/discussions) or issue first if direction is unclear.
- If the maintainer 👍s the direction, open a PR.

### Contract changes (anything touching Adapter, Tool, Memory, Retriever, Skill, Runtime)
- Requires a new **ADR** in `docs/architecture/adrs/`.
- Requires a coordinated **major bump** across affected packages.
- Requires a **deprecation cycle** of ≥ 1 minor release per [`docs/STABILITY.md`](./docs/STABILITY.md).
- Merges only after the ADR is approved by the maintainer.

### Disputes
Raised in the relevant PR/issue, escalated via [Discussions](https://github.com/AgentsKit-io/agentskit/discussions) if needed. Maintainer has final call. Disagreements are healthy; rudeness is not — see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Release cadence

- **Patches** — as needed, typically weekly.
- **Minors** — when a coherent set of features is ready.
- **Majors** — only when a core contract changes. Rare by design (see [`docs/STABILITY.md`](./docs/STABILITY.md)).

Releases are cut via Changesets. Every user-facing PR ships with a changeset describing the impact.

## Package tiers

Not every package gets the same SLA. The ecosystem ships under two
tiers so the maintainer-led core stays small and reviewable while
community packages can move at their own pace.

### Tier 1 — First-party (maintainer-supported)

Same SLA as core: covered by `SECURITY.md`, gated by CI bundle/perf
budgets, breaking changes require an ADR + deprecation cycle.

- `@agentskit/core`
- `@agentskit/adapters`
- `@agentskit/runtime`
- `@agentskit/tools`
- `@agentskit/skills`
- `@agentskit/memory`
- `@agentskit/rag`
- `@agentskit/sandbox`
- `@agentskit/observability`
- `@agentskit/eval`
- `@agentskit/cli`
- `@agentskit/react`
- `@agentskit/ink`
- `@agentskit/templates`

### Tier 2 — Community / experimental

Same code style, same CI, but maintained on a best-effort basis. Bug
reports and PRs are welcome; release cadence and stability guarantees
are lower. The maintainer reserves the right to demote a tier-1
package here if it goes too long without an owner.

- `@agentskit/angular`
- `@agentskit/vue`
- `@agentskit/svelte`
- `@agentskit/solid`
- `@agentskit/react-native`
- `@agentskit/eval-braintrust`
- `@agentskit/observability-langfuse`

Tier moves happen explicitly via an ADR + this document, never silently.

## What's off-limits

- Adding runtime dependencies to `@agentskit/core`.
- Silent breaking changes. Every breaking change requires a major bump + deprecation cycle + changeset.
- Merging without CI green (bundle budgets, coverage, E2E, lint).
- Force-push to `main`.

## License

MIT — see [LICENSE](./LICENSE). Contributions are accepted under the same license.
