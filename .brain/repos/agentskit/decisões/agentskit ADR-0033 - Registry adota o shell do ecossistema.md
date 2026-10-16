---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: proposto
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0033-registry-ecosystem-shell.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0033 - Registry adota o shell do ecossistema

> [!tldr] Em linguagem comum
> Registry adopts the ecosystem shell.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Proposed, pending visual review; - **Date**: 2026-09-25.

## Decisão em linguagem comum

Use the generated ecosystem asset for the six-product bar and tour, with Registry
selected. Keep Fumadocs responsible for the local header, search, theme, and
mobile menu. Adopt the AgentsKit aurora shader on Registry's homepage with the
Registry blue accent and replace its cursor effect. Align the Registry footer's
layout and glass treatment with AgentsKit while highlighting only the current
product link. Documentation pages retain solid reading surfaces.

The Registry-specific content stays in Registry. This change does not create a
cross-repository package or change the documentation shell.

## Contexto

Registry already uses Fumadocs for its local navigation and a generated script
for the ecosystem bar and interactive tour. Its homepage still had a separate
cursor effect and footer layout, so the family of sites did not read as one
product system.

## Consequências

Não registrado na fonte.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0033-registry-ecosystem-shell.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0033-registry-ecosystem-shell.md:1`
