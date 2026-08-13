# ADR 0022: Consolidate vendor adapters into owning packages

## Status

Superseded — 2026-08-13

## Context

Workspace module boundaries had become npm product boundaries by default.
Small vendor adapters consequently maintained independent package names,
versions, changelogs, provenance records, and documentation even though their
contracts and compatibility were owned by a parent capability.

The original consolidation proposal treated vendor adapters as subpaths. The
published contract now gives the Braintrust and Langfuse adapters standalone
package names so they can be installed, versioned, and documented directly.

## Decision

The original decision was to publish vendor adapters as subpath exports:

- `@agentskit/observability/langfuse`
- `@agentskit/eval/braintrust`
- `@agentskit/eval/braintrust/scorers`
- `@agentskit/eval/braintrust/ci`
- `@agentskit/tools/validation`

The existing workspace packages remain `private: true` for ownership and test
isolation. Their sources are built into the parent artifacts. Previously
published package names receive deprecation releases and are not unpublished.

A follow-up release decision made `@agentskit/eval-braintrust` and
`@agentskit/observability-langfuse` public standalone packages. The private
workspace implementations remain their source of truth. `@agentskit/tools/validation`
continues to be a public subpath because it is intentionally owned by
`@agentskit/tools`.

## Consequences

- Three independent npm release lines are removed.
- Optional vendor SDKs remain dynamically loaded and affect only consumers of
  the corresponding subpath.
- The parent package controls adapter compatibility and documentation.
- Future vendor bindings default to subpaths unless an ADR demonstrates an
  independent contract, dependency lifecycle, and consumer audience.
