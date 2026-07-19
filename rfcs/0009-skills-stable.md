# RFC 0009 — `@agentskit/skills` stable surface

- **Status**: Proposed
- **Date**: 2026-07-16
- **Author**: @EmersonBraun
- **Related**: [ADR 0005](../docs/architecture/adrs/0005-skill-contract.md), [ADR 0024](../docs/architecture/adrs/0024-package-graduation-evidence.md), [ADR 0025](../docs/architecture/adrs/0025-public-api-and-compatibility-gates.md), [`docs/STABILITY.md`](../docs/STABILITY.md)

## Summary

This RFC proposes the public surface and behavioral commitment for promoting
`@agentskit/skills` from beta to stable. Contract, catalog, composition,
marketplace, mutation-isolation, and CLI interoperability hardening are
implemented, but this proposal does **not** promote the package or claim that
the time- and release-based gates have elapsed.

## Proposed stable commitment

At 1.0, the package commits to the exports recorded by its declaration snapshot
and to the Skill v1 behavior pinned by ADR 0005. In particular:

- every bundled definition satisfies S1–S12 and remains purely declarative
  except for the optional `onActivate` hook;
- adding a built-in is compatible, while removing or renaming one requires the
  stable deprecation and major-version process;
- `getBuiltinSkills()` and `listSkills()` cover the same canonical catalog and
  return defensive data that cannot mutate package definitions;
- `composeSkills()` validates inputs, returns defensive output, creates a
  deterministic S1-compatible name, and applies documented last-wins behavior
  for duplicate references, metadata keys, temperature, and dynamic tools;
- tool and delegate arrays remain references by name; resolution and execution
  belong to the consuming runtime or orchestrator;
- `createSkillRegistry()` isolates publication and installation data, uses
  strict SemVer, rejects malformed runtime input with typed AgentsKit errors,
  and safely supports every name permitted by S1, including `__proto__`;
- the supported range surface is exact, `^`, `~`, `>=`, and `*`. Broader npm
  range grammar is not implied; prereleases are excluded unless targeted by a
  same-core prerelease comparator.

Prompt wording and built-in examples may improve compatibly when the behavioral
role and safety boundary are preserved. Weakening a documented hard safety rule,
changing composition precedence, or changing registry isolation/range semantics
is behavioral breakage and follows the stable deprecation process.

## Evidence already implemented

- One ADR 0005 harness covers all 26 built-ins, with dedicated engineering,
  vertical, safety-boundary, and golden-example suites.
- Composition tests cover zero/single/multi-skill paths, deterministic names,
  defensive cloning, precedence, dynamic-tool deduplication, and hook failures.
- Marketplace tests cover strict SemVer and prereleases, malformed JavaScript
  inputs, duplicate publication, defensive copies, concurrent calls, and
  prototype-sensitive JSON keys.
- CLI resolution derives from the canonical catalog rather than a duplicated
  five-skill allowlist, and monorepo interop asserts the same composition and
  discovery behavior.
- The package clears its 95% line-coverage floor, strict TypeScript build, dual
  ESM/CJS build, and 28 KB compressed-size budget without new runtime dependencies.
- Public API snapshots, packed consumers, supported Node/TypeScript compatibility,
  and Doc Bridge are repository-wide blocking gates.

## Gates that remain open

The hardening changes include an intentional beta breaking change: composed
names move from the S1-invalid `researcher+coder` form to `researcher_coder` and
therefore require the 0.9 minor line. Under ADR 0024, the 90-consecutive-day
window starts when that breaking line is released; if 0.9.0 were published on
2026-07-16, the earliest possible completion would be 2026-10-14. A later
publication moves that date, and any later unplanned break resets it again.

Promotion also requires:

1. releases from at least two distinct beta minor lines during the clean window;
2. an Accepted version of this dedicated RFC;
3. a complete `docs/stability/skills.json` evidence manifest accepted in review;
4. every direct internal runtime, optional, and peer dependency at stable;
5. the coordinated 1.0.0 metadata, badge, policy, and changeset update.

Until all five are true, `@agentskit/skills` remains beta and consumers should
apply the beta pinning guidance from `docs/STABILITY.md`.

## Decision requested

Review whether the proposed surface is small enough for a long stable lifecycle,
whether catalog additions and prompt refinements are classified correctly, and
whether the composition/registry evidence is sufficient. Acceptance records the
intended freeze; it does not waive ADR 0024 or authorize early promotion.
