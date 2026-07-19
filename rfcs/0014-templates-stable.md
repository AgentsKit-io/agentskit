# RFC 0014 — `@agentskit/templates` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: AgentsKit Contributors
- **Package**: `@agentskit/templates`
- **Related**: [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/templates` from beta to stable. Scaffold security, config
validation, factory validators, and blueprint honesty are hardened on the
current beta line. This proposal does **not** promote the package or claim that
publish, soak, release, dependency, or evidence gates have elapsed.

## Proposed stable commitment

At 1.0, the package commits to the root export surface and these behaviors:

- **Factories** — `createToolTemplate`, `createSkillTemplate`,
  `createAdapterTemplate` validate trim-non-empty identity fields, function
  `execute`/`createSource`, JSON Schema plain objects (not null/array), and
  finite optional `temperature`. `capabilities` and `metadata` passthrough is
  preserved. Base merges keep legitimate extensions.
- **Scaffold types** — the eight shapes (`tool`, `skill`, `adapter`,
  `memory-vector`, `memory-chat`, `flow`, `embedder`, `browser-adapter`) remain
  the committed set unless a coordinated major renames them.
- **Config validation** — unscoped kebab-case `name`, non-empty `dir`, optional
  description without NUL / bounded length, type allowlist, before any write.
- **Filesystem safety** — path containment; no destination-root symlink overwrite;
  collision fails unless `overwrite: true`; sibling staging + atomic rename;
  backup+rollback on overwrite; no partial final trees; returned paths are final.
- **Generated packages** — dual ESM/CJS/types; `engines.node >=20`; MIT;
  `sideEffects: false`; tsup `clean: true`; named exports in source (tsup
  default config export is the documented technical exception); caret-pinned
  deps (`@agentskit/core ^1.0.0`, flow also `@agentskit/runtime ^0.10.0`); no
  wildcards; no invented unused deps.
- **memory-chat** — uses the real `MemoryRecord` contract via
  `serializeMessages` / `deserializeMessages`.

Compatible post-1.0 changes include additive scaffold types, optional config
fields that preserve defaults, and new factory options with passthrough
semantics. Breaking changes include weakening overwrite/symlink guarantees,
accepting traversal names, reintroducing wildcard deps, or removing committed
exports without a major.

### Explicitly deferred

- **Scoped package names** (`@org/pkg`) — not part of the beta commitment;
  requires a dedicated beta migration note before any stable freeze that includes them.

## Evidence already implemented

- Adversarial suite covers invalid type/name/dir, collision, symlink,
  overwrite, determinism, eight-type matrix, and typecheck of generated sources
  against workspace TypeScript without network.
- Package-manifest purity asserts dual exports, named surface, beta tier.
- Package remains **beta** in `package.json` / README badge / STABILITY map.

## Gates that remain open

Under ADR 0024, the 90-consecutive-day soak begins only when this hardening
minor is **published**. Publication has not occurred as part of this proposal;
any later date moves the earliest possible completion, and an unplanned break
resets the clock.

Promotion also requires:

1. publish of the current or equivalent beta minor line;
2. ≥90 consecutive beta days after publication without a resetting break;
3. releases from at least two distinct beta minor lines during the clean window;
4. an Accepted version of this dedicated RFC;
5. a complete `docs/stability/templates.json` evidence manifest accepted in review;
6. stable status for every direct internal runtime/peer dependency required by
   the committed stable surface (`@agentskit/core` already stable; generated
   consumer deps such as `@agentskit/runtime` must meet the policy in force at
   promotion time for any surface that requires them);
7. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until every gate is complete, `@agentskit/templates` remains **beta**.

## Decision requested

Review whether the factory validation, eight scaffold shapes, and filesystem
safety commitments are narrow enough for a future stable freeze. Acceptance
records the intended freeze; it does not waive ADR 0024 or authorize promotion
before publication, soak, releases, evidence, dependencies, and 1.0.0 are complete.
