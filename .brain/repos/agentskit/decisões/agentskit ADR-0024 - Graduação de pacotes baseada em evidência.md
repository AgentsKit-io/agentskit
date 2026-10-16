---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0024-package-graduation-evidence.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0024 - Graduação de pacotes baseada em evidência

> [!tldr] Em linguagem comum
> Evidence-backed package graduation.

← [[00 Decisões - agentskit]]

## Status e datas

- Status: Accepted; - Date: 2026-07-16.

## Decisão em linguagem comum

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

## Contexto

AgentsKit already assigns every package a stability tier and enforces coverage,
README badges, and the presence of a promotion RFC. Those checks establish a
useful baseline, but they do not prove that a package is complete for its stated
scope, resilient under failure, portable across its supported environments, or
sustainable after the promotion.

The previous beta-to-stable rule also allowed one minor release with no minimum
elapsed time. A package could therefore satisfy the letter of the policy before
consumers had experienced it across meaningful release cycles. General RFCs
could mention several packages without committing one package's exact surface.

## Consequências

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

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0024-package-graduation-evidence.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0024-package-graduation-evidence.md:1`
