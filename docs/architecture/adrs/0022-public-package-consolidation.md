# ADR 0022: Consolidate vendor adapters into owning packages

## Status

Accepted — 2026-07-14

## Context

Workspace module boundaries had become npm product boundaries by default.
Small vendor adapters consequently maintained independent package names,
versions, changelogs, provenance records, and documentation even though their
contracts and compatibility were owned by a parent capability.

`@agentskit/observability/langfuse` is an observability backend and
`@agentskit/eval/braintrust` is an evaluation backend. Neither is a standalone
platform contract.

## Decision

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

## Consequences

- Three independent npm release lines are removed.
- Optional vendor SDKs remain dynamically loaded and affect only consumers of
  the corresponding subpath.
- The parent package controls adapter compatibility and documentation.
- Future vendor bindings default to subpaths unless an ADR demonstrates an
  independent contract, dependency lifecycle, and consumer audience.
