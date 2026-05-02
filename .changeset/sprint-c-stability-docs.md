---
---

chore(docs): publish stability levels + promotion criteria.

Closes O of the enterprise-readiness audit (#562). New
`/docs/reference/stability.mdx` formalises:

- The three levels (`alpha` / `beta` / `stable`) with semantics for
  contract changes, versioning, and coverage thresholds.
- A current-status table for every `@agentskit/*` package.
- **Alpha → beta promotion criteria**: API stable ≥ 2 sprints,
  coverage ≥ 70% lines, ≥ 1 external integration story, stability
  note in package.json. Targets the 5 UI bindings (angular, vue,
  svelte, solid, react-native).
- **Beta → stable promotion criteria**: ADR locks the contract,
  coverage ≥ 80%, no breaking changes for ≥ 1 quarter, migration
  guide for any queued breaking change, version bumped to 1.0.0.
  Targets eval, observability, sandbox.
- **Demotion criteria** + **until-promoted guidance** for consumers
  pinning alpha/beta deps.

Linked from `apps/docs-next/content/docs/reference/meta.json`.
