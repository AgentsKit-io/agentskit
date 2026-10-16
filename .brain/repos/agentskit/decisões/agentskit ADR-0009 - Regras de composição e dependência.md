---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0009-composition-rules.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0009 - Regras de composição e dependência

> [!tldr] Em linguagem comum
> Regras de composição e dependência entre pacotes. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-06-03.

## Decisão em linguagem comum

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

## Contexto

AgentsKit is a monorepo of ~20 packages that must combine in any order
("interoperability is mandatory"). Without explicit composition rules, packages
accrete cross-dependencies, contracts get duplicated inline, and the dependency
graph develops cycles — each of which breaks plug-and-play installs and balloons
bundle size. The Manifesto and `CLAUDE.md` state the principles; this ADR makes
the dependency and duplication rules enforceable and unambiguous.

## Consequências

- New shared behaviour lands in `core` as a contract + injection point, with the
  implementation in an opt-in package.
- A genuinely new bounded concern gets its own package (with for-agents doc,
  changeset, named exports); incidental code stays in an existing package.
- Sideways or circular dependencies are rejected in review and by the build.

## Pacotes afetados

- [[agentskit-core]], [[agentskit-runtime]], [[agentskit-sandbox]], [[agentskit-skills]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0009-composition-rules.md:1`
