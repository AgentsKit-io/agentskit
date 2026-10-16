---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0021-ecosystem-manifest-and-claims.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência

> [!tldr] Em linguagem comum
> Versioned ecosystem manifest and evidence-backed claims.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Proposed; - **Date**: 2026-07-13.

## Decisão em linguagem comum

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
`products`; removal requires a coordinated v3 after all sibling consumers migrate.

## Contexto

AgentsKit already owns `ecosystem.json`, copies it into the documentation and landing
applications, generates an ecosystem bar from it, derives AgentsKit counts through
`scripts/compute-stats.mjs`, and blocks new hard-coded count drift. These pieces are useful
and should be deepened rather than replaced.

The current manifest models four web properties. The product ecosystem now has more
members, including AgentsKit, Registry, Playbook, AgentsChat, Doc Bridge, and Code Review. Not every product has the same surfaces: Code Review intentionally remains
repository-native and has no Fumadocs site or embedded chat. The existing shape requires a
domain and treats every member as a web property, so it cannot represent that distinction
without misleading consumers.

The current stats snapshot is also a property-specific count payload, not a public-claim
ledger. It exposes values but not the derivation, owner, or evidence needed to decide
whether marketing copy such as “300+ agents” is reproducible.

## Consequências

### Positive

- All products are represented by one parent-brand contract.
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

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0021-ecosystem-manifest-and-claims.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0021-ecosystem-manifest-and-claims.md:1`
