# ADR 0024 — Evidence-backed package graduation

- Status: Accepted
- Date: 2026-07-16
- Supersedes: —
- Related issues: #650, #1198

## Context

AgentsKit already assigns every package a stability tier and enforces coverage,
README badges, and the presence of a promotion RFC. Those checks establish a
useful baseline, but they do not prove that a package is complete for its stated
scope, resilient under failure, portable across its supported environments, or
sustainable after the promotion.

The previous beta-to-stable rule also allowed one minor release with no minimum
elapsed time. A package could therefore satisfy the letter of the policy before
consumers had experienced it across meaningful release cycles. General RFCs
could mention several packages without committing one package's exact surface.

## Decision

Package quality and stability tier are related but distinct. Each package is
assessed on five axes:

1. **API stability** — the public surface is explicit, snapshot-tested, and
   governed by semver.
2. **Functional completeness** — the documented scope and package-specific
   contracts are implemented without critical gaps.
3. **Resilience** — failure, cancellation, concurrency, resource, and recovery
   behavior are exercised in proportion to the package's risk.
4. **Portability** — the packed artifact installs and runs across every claimed
   module, Node, browser, edge, SSR, framework, and TypeScript environment.
5. **Sustainability** — ownership, documentation, migration, deprecation, and
   release procedures are maintainable.

`beta` to `stable` is an individual package decision. A non-core package may be
promoted only when all of these conditions hold:

- a dedicated `rfcs/NNNN-<package-directory>-stable.md` is `Accepted` and names
  exactly one package;
- the package has completed at least 90 consecutive days at beta after its last
  breaking change;
- at least two released beta versions belong to distinct minor lines during
  that window (for example, `0.8.x` and `0.9.x`); patch releases in one minor
  line do not satisfy this condition;
- no unplanned breaking change occurred during the window; a breaking change
  resets the window and release-line count;
- every direct internal runtime, optional, or peer dependency is already
  `stable`;
- repository evidence exists for the committed API, package pack/install
  smoke, completeness, resilience, compatibility, and sustainability.

Evidence is declared in `docs/stability/<package-directory>.json` using the
repository schema documented in `docs/stability/README.md`. Gates validate the
machine-checkable portions; reviewers remain responsible for judging whether
the evidence is strong enough for the package's risk profile.

Promotions happen in dependency order and never as an ecosystem-wide version
flip. `@agentskit/core` remains exempt from the promotion RFC and evidence file
because it graduated under ADRs 0001–0006 and `docs/RELEASE-CORE-V1.md`.

## Rationale

Ninety days exposes a package to real maintenance and adoption time, while two
minor lines prove that its release process can evolve without breaking the
committed surface. Requiring both avoids treating either elapsed time or release
count as sufficient on its own.

Failing stable packages that depend on lower-tier internal packages prevents a
stable promise from being invalidated transitively. Separating the five quality
axes prevents coverage or an RFC from standing in for production readiness.

## Consequences

### Positive

- Stable becomes a verifiable package promise rather than a metadata change.
- Dependency order determines promotion waves and exposes architectural
  coupling early.
- Evidence remains reviewable in the repository and can feed a generated
  readiness scorecard.
- Package-specific rigor can increase with risk without weakening common gates.

### Negative

- Graduation takes at least 90 days after the last breaking beta change.
- Maintainers must produce and review evidence artifacts for each package.
- Some packages must remove or stabilize internal dependencies before they can
  graduate.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| One beta minor with no time floor | Can pass before meaningful consumer exposure |
| Coverage plus green CI | Does not prove packaging, portability, failure behavior, or API discipline |
| One RFC for a family of packages | Hides package-specific caveats and permits accidental promotion |
| Promote the full ecosystem together | Couples unrelated risk and lets weak packages inherit stronger packages' evidence |
| Require zero dependencies for every stable package | Incompatible with adapters and bindings; stable transitive dependencies are sufficient |

## Open questions

- Which packages warrant mutation, fault-injection, or performance regression
  gates beyond the common baseline.
- Which compatibility jobs should become required checks after the first two
  graduation waves establish stable runtimes and cost.

## References

- [`docs/STABILITY.md`](../../STABILITY.md)
- [`docs/stability/README.md`](../../stability/README.md)
- [ADR 0009 — Composition and dependency rules](./0009-composition-rules.md)
- [`docs/V1-READINESS-TRACKER.md`](../../V1-READINESS-TRACKER.md)
