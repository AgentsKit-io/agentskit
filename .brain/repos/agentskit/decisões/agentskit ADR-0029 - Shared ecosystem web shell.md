---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0029-shared-ecosystem-web-shell.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0029 - Shared ecosystem web shell

> [!tldr] Em linguagem comum
> Shared ecosystem web shell.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Accepted; - **Date**: 2026-07-20.

## Decisão em linguagem comum

AgentsKit will extend the existing hosted, zero-dependency web shell rather than
introduce a framework-specific runtime package.

The shell has four shared surfaces:

1. the existing ecosystem bar;
2. a product masthead with local-navigation slots and a standard search trigger;
3. a command palette that searches the current product first and can expand to
   the six public ecosystem indexes;
4. a semantic ecosystem footer with product-local, ecosystem, and resource slots.

The canonical public projection is served from `/api/ecosystem.json`. It contains
only products whose `navigation.showInBar` value is true, preserving Code Review
as a repository-native catalog entry without presenting it as a seventh public
site.

Identity, URLs, accents, lifecycle stages, and shared calls to action come from
the canonical manifest. Numeric claims continue to come from their owning product
and the generated claims system established by ADR 0021. Consumers do not keep
independent copies of either kind of data.

Each product supplies only local navigation and a local search index. Search
falls back to the current product when another product index is unavailable. A
failure to load the hosted shell or live manifest must leave usable local
navigation and the last generated identity snapshot in place.

Heroes and closing calls to action follow shared layout and writing contracts but
remain product-owned. They are not rendered by the remote shell because their
demonstrations and conversion goals differ materially.

## Contexto

The six public AgentsKit sites already consume one hosted ecosystem bar and one
canonical product manifest. Their product headers, search affordances, closing
calls to action, and footers are still implemented independently. The result is
structural drift: some sites have no product masthead, some have no search or
semantic footer, and the same product identity is expressed with different
spacing, typography, and link groups.

The sites use different application stacks and deploy independently. A React-only
package would not cover every consumer, while copying components into each
repository would recreate the drift the shared bar already solved.

## Consequências

### Positive

- All six public sites share the same structural and accessibility contract.
- Search and ecosystem discovery become predictable across products.
- Header and footer changes can ship once with a versioned rollback path.
- Product-specific pages keep control of their narrative and demonstrations.

### Negative

- The hosted shell becomes shared first-party infrastructure and needs explicit
  compatibility tests.
- Local search indexes need a small common result contract.
- Consumers must preserve a local fallback for shell or network failure.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0029-shared-ecosystem-web-shell.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0029-shared-ecosystem-web-shell.md:1`
