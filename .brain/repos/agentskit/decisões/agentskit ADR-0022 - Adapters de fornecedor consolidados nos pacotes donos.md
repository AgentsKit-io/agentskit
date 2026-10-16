---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0022-public-package-consolidation.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos

> [!tldr] Em linguagem comum
> Consolida os adaptadores de fornecedor nos pacotes donos. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-07-14.

## Decisão em linguagem comum

Publish vendor adapters as subpath exports of their owning packages:

- `@agentskit/observability/langfuse`
- `@agentskit/eval/braintrust`
- `@agentskit/eval/braintrust/scorers`
- `@agentskit/eval/braintrust/ci`
- `@agentskit/tools/validation`

The existing workspace packages remain `private: true` for ownership and test
isolation. Their sources are built into the parent artifacts. Previously
published package names receive deprecation releases and are not unpublished.

A workspace package is public only when consumers can reasonably install and
version it independently. Internal organization alone does not justify an npm
package.

## Contexto

Workspace module boundaries had become npm product boundaries by default.
Small vendor adapters consequently maintained independent package names,
versions, changelogs, provenance records, and documentation even though their
contracts and compatibility were owned by a parent capability.

`@agentskit/observability/langfuse` is an observability backend and
`@agentskit/eval/braintrust` is an evaluation backend. Neither is a standalone
platform contract.

## Consequências

- Three independent npm release lines are removed.
- Optional vendor SDKs remain dynamically loaded and affect only consumers of
  the corresponding subpath.
- The parent package controls adapter compatibility and documentation.
- Future vendor bindings default to subpaths unless an ADR demonstrates an
  independent contract, dependency lifecycle, and consumer audience.

## Pacotes afetados

- [[agentskit-adapters]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0022-public-package-consolidation.md:1`
