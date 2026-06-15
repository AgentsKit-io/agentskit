# Semver commitment

> The public, ecosystem-wide versioning promise for all `@agentskit/*` packages.
> This is the third of the three v1.0.0 criteria in [`STABILITY.md`](./STABILITY.md)
> ("a public commitment to the semver discipline is documented and honored").
> Progress on all three is tracked in [`V1-READINESS-TRACKER.md`](./V1-READINESS-TRACKER.md).

## The promise

Every `@agentskit/*` package follows [Semantic Versioning](https://semver.org) **scoped
to its stability tier**. The tier is declared in each package's `package.json`
(`agentskit.stability`), shown as a README badge, and listed authoritatively in
[`STABILITY.md`](./STABILITY.md) — three sources kept in lockstep by CI gates
(`check-stability-tier`, `check-readme-badge`).

## What each tier guarantees

### `stable`
- **No breaking change to the public surface in a minor or patch.** Breaking changes
  require a **major** bump **and** a deprecation cycle (a deprecated API lives ≥ 1 minor
  before removal).
- Contracts are pinned to ADRs; changing one needs a new ADR + a coordinated major bump
  of every affected package.
- Promotion into `stable` is gated by a promotion RFC (`check-promotion-rfc`) documenting
  the committed surface.
- **Consumers**: pin with `^x.y.z` and trust the minor-bump contract.

### `beta`
- Usable in production. The public shape may still be refined as real usage teaches us.
- **Breaking changes land in minor bumps** (not major — major is reserved for stable
  contracts), always with migration notes in the changeset/CHANGELOG.
- Within `0.x`: a **minor** bump may break; a **patch** bump may not.
- **Consumers**: pin with `~x.y.z` if conservative, or accept that minors may break you.

### `alpha`
- Early and moving. Anything may change in any release, including removal. No deprecation
  guarantees.
- **Consumers**: pin exact and read the changelog on every update.

## How we honor it

- **Changesets** describe every user-facing change; releases are cut via `changeset version`.
- **CI gates** enforce the discipline structurally: tier ↔ badge ↔ policy-doc parity,
  per-tier coverage floors, promotion-RFC presence for `stable`, core's zero-dep + bundle budget.
- **Tier changes are deliberate**: `alpha→beta` needs a PR explaining the earn; `beta→stable`
  needs an RFC + ≥ 1 minor at beta without breaking; demoting a `stable` package needs an RFC + major bump.

## The one exception

`@agentskit/core` is the only package at `1.x` today; it carries the full `stable`
commitment (see [`RELEASE-CORE-V1.md`](./RELEASE-CORE-V1.md)). Every other package is
tier-declared individually on the `0.x` track and graduates to `1.0` on its own
schedule — the project reaches v1.0.0 when the criteria in `STABILITY.md` are met.

## References

- [`STABILITY.md`](./STABILITY.md) — tier definitions + current map
- [`V1-READINESS-TRACKER.md`](./V1-READINESS-TRACKER.md) — v1.0.0 criteria progress
- [`rfcs/`](../rfcs/) — promotion RFCs
