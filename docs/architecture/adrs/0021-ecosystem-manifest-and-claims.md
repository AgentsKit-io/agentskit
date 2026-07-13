# ADR 0021 — Versioned ecosystem manifest and evidence-backed claims

- **Status**: Proposed
- **Date**: 2026-07-13
- **Supersedes**: —
- **Related issues**: #1198, #1200

## Context

AgentsKit already owns `ecosystem.json`, copies it into the documentation and landing
applications, generates an ecosystem bar from it, derives AgentsKit counts through
`scripts/compute-stats.mjs`, and blocks new hard-coded count drift. These pieces are useful
and should be deepened rather than replaced.

The current manifest models four web properties. The product ecosystem now has seven
members: AgentsKit, Registry, Playbook, AgentsChat, Doc Bridge, Code Review, and AgentsKit
OS. Not every product has the same surfaces: Code Review intentionally remains
repository-native and has no Fumadocs site or embedded chat. The existing shape requires a
domain and treats every member as a web property, so it cannot represent that distinction
without misleading consumers.

The current stats snapshot is also a property-specific count payload, not a public-claim
ledger. It exposes values but not the derivation, owner, or evidence needed to decide
whether marketing copy such as “300+ agents” is reproducible.

## Decision

AgentsKit owns two small, versioned, deterministic contracts.

### 1. `ecosystem.json` v2 — stable product identity

The manifest models products rather than assuming every entry is a web property. Each
product declares:

- stable `id`, public `name`, short navigation label, kind, role, and promise;
- repository and maturity;
- brand accent;
- optional home, docs, `llms.txt`, and stats surfaces;
- documentation mode (`fumadocs` or `repository`);
- chat mode (`agentschat`, transitional `custom`, or `none`);
- whether and where it appears in shared navigation;
- contextual next-product IDs.

Consumers derive the ecosystem bar from products that opt into shared navigation. A
product without a website remains representable without inventing a domain.

The parent brand is explicit in the manifest. Builder attribution remains link-source-only
and is not presented as a peer product.

### 2. `ecosystem-claims.json` v1 — generated values and evidence

The claims ledger is generated, never hand-edited. A claim contains:

- stable claim ID and owning product ID;
- exact numeric value;
- display noun and optional conservative floor used by “N+” copy;
- evidence type, repository/path or public endpoint, and derivation summary;
- verification state.

The first slice emits claims that AgentsKit can derive locally through the existing
`computeStats()` module. Other products declare their authoritative stats surface in the
manifest and publish their owned claims in their repository-specific migration slices.
The canonical manifest does not fetch sibling repositories at runtime or make their build
availability a prerequisite for AgentsKit builds.

### Validation and distribution

A standard-library module parses and validates the manifest and claims at the script
boundary. It returns normalized data or throws diagnostics containing the invalid field
path. The parser is the executable contract; committed JSON remains portable to every
language and repository.

Generation is deterministic: no wall-clock timestamp is committed. Content freshness is
proven by regenerating and comparing the expected artifact. Existing application copies
and ecosystem-bar generation continue through `sync-ecosystem.mjs`, updated to consume the
v2 parser and navigation projection.

The existing `/api/stats.json` contract remains property-specific and backward compatible.
The claims ledger complements it; it does not rename or remove current count fields.

During the cross-repository migration, v2 also retains the deprecated v1 `properties`
projection for AgentsKit, Registry, Playbook, and AKOS. Validation keeps it aligned with
`products`; removal requires a coordinated v3 after all sibling consumers migrate.

## Rationale

1. **Extend what already works.** The repository already has derivation, snapshots, copies,
   and drift gates. A second platform or package would duplicate them.
2. **Products are not identical surfaces.** Optional, explicit surfaces represent Code
   Review honestly and allow future products without fabricated domains.
3. **Identity and claims change at different rates.** A stable manifest should not be
   rewritten whenever a package or agent count changes.
4. **Owners derive their own numbers.** AgentsKit must not scrape sibling repositories or
   make cross-site network availability part of a deterministic build.
5. **Portable JSON, executable parser.** Repositories can copy/read the artifacts without a
   runtime package while AgentsKit still fails closed at its boundary.
6. **No new runtime dependency.** The root scripts can validate this narrow contract with
   standard JavaScript and focused tests.

## Consequences

### Positive

- All seven products are represented by one parent-brand contract.
- Repository-native products no longer need fake web fields.
- Shared navigation becomes an explicit projection rather than a hard-coded order.
- Numeric claims carry evidence and ownership.
- Existing stats APIs and consumers remain available.
- Generation and freshness remain deterministic and CI-friendly.

### Negative

- v1 consumers remain supported while migrating from `properties` to `products`.
- Product metadata is intentionally more verbose than the current web-property registry.
- The first claims ledger is incomplete for sibling-owned counts until their migration
  slices publish authoritative data.
- A focused parser duplicates a subset of what a JSON Schema library could provide.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep four web properties and document the other products elsewhere | Preserves fragmentation and cannot drive complete discovery |
| Add Code Review with a fabricated domain | Misrepresents the agreed repository-native product surface |
| Put dynamic counts directly in `ecosystem.json` | Couples stable identity to high-churn generated data |
| Fetch every sibling stats endpoint during each build | Makes deterministic local builds depend on network and sibling availability |
| Publish a new shared brand/ecosystem runtime package | Adds release/deployment coupling for data that is already distributed as generated JSON |
| Add a general schema-validation dependency at the root | Unnecessary for two narrow JSON boundaries; revisit if contracts multiply |

## Open questions

- Which sibling repository is the first to publish a v1 claims artifact after AgentsKit?
- Should the certification slice later aggregate all property claims into one signed release
  snapshot, or keep them federated and cache only the verification result?

## References

- Parent PRD: #1198
- Tracer slice: #1200
- `docs/studies/ecosystem-cohesion-plan.md`
- `scripts/compute-stats.mjs`
- `scripts/gen-ecosystem-stats.mjs`
- `scripts/check-count-drift.mjs`
- `scripts/sync-ecosystem.mjs`
