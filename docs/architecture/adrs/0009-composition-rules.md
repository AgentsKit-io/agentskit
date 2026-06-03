# ADR 0009 — Composition & dependency rules

- **Status**: Accepted
- **Date**: 2026-06-03
- **Supersedes**: —
- **Related issues**: —

## Context

AgentsKit is a monorepo of ~20 packages that must combine in any order
("interoperability is mandatory"). Without explicit composition rules, packages
accrete cross-dependencies, contracts get duplicated inline, and the dependency
graph develops cycles — each of which breaks plug-and-play installs and balloons
bundle size. The Manifesto and `CLAUDE.md` state the principles; this ADR makes
the dependency and duplication rules enforceable and unambiguous.

## Decision

**1. Dependency direction is one-way, rooted at `core`.**

```
core  ← (everything depends on core)
core → ∅            (core depends on nothing — runtime deps forbidden)
adapters, react, ink, runtime, tools, skills, memory, rag, sandbox,
observability, eval, validation   → may depend on core only
framework bindings (vue/svelte/solid/angular/react-native) → core (+ their framework)
cli → core, runtime, adapters, tools, templates
```

- A package may depend on `core` and on declared peers, never "sideways" into an
  unrelated sibling's internals.
- **No circular imports**, within or across packages. Enforced by build (tsup
  fails) and review.

**2. `core` is the contract registry and stays zero-dependency.**

- All cross-package contracts (Adapter, Tool, Memory, Retriever, Skill, Runtime,
  `ArgsValidator`) live in `@agentskit/core` as types + the typed error system.
- `core` declares **zero runtime dependencies** (gate: `check-core-no-deps`) and
  is capped at 10 KB gzipped (gate: `size-limit`).
- A third-party library never enters `core`. It goes in an opt-in package behind
  a core-defined injection point with a safe default (see ADR-0008 for the
  `ArgsValidator` precedent).

**3. Contracts are defined once.**

- Schemas use `JSONSchema7`; error codes live in `core/src/errors.ts`. Never
  re-declare a contract inline in a consumer (gate: `check-no-bare-throw` covers
  errors; review covers schemas). See ADR-0003 (contract registry) and the
  `feedback_json-schema-canonical` memory.

**4. Boundaries are earned, not pre-designed.**

- Prefer a few cohesive packages over many thin ones. Split a module into a new
  package only when a real second consumer or a distinct install story forces
  it — not speculatively.
- File-size budgets (gate: `check-file-size`) force *intra*-package extraction
  before a file becomes unreadable; package splits are a separate, deliberate
  decision.

**5. Every package is independently installable and dual-format.**

- Named exports only (gate: `check-named-exports`), tsup dual CJS/ESM,
  `sideEffects: false`, and a for-agents doc page (gate:
  `check-for-agents-coverage`).

## Rationale

One-way dependencies rooted at a pure core are what make arbitrary package
combinations work without conflicts and keep tree-shaking effective. Defining
contracts once removes the most common source of drift. "Earned boundaries"
avoids the 30-packages-on-day-one failure mode while file-size gates still keep
individual modules small.

## Consequences

- New shared behaviour lands in `core` as a contract + injection point, with the
  implementation in an opt-in package.
- A genuinely new bounded concern gets its own package (with for-agents doc,
  changeset, named exports); incidental code stays in an existing package.
- Sideways or circular dependencies are rejected in review and by the build.

## Alternatives considered

- **Layered `contracts` package separate from `core`.** Rejected: `core` already
  *is* the contract layer and is kept pure by gates; a second package adds
  ceremony without benefit.
- **Pre-designed fine-grained package set.** Rejected: speculative boundaries
  cost more than they save; split on real pressure.

## References

- ADR-0003 (contract registry), ADR-0008 (runtime validation / injection-point
  precedent)
- `scripts/check-core-no-deps.mjs`, `check-file-size.mjs`, `check-named-exports.mjs`
- `.agent-memory/feedback_zero-dep-core.md`, `feedback_json-schema-canonical.md`
- Manifesto principle 1 (core ≤ 10 KB)
