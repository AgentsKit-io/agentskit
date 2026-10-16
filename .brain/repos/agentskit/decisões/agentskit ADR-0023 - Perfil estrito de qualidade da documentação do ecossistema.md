---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0023-ecosystem-documentation-quality.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0023 - Perfil estrito de qualidade da documentação do ecossistema

> [!tldr] Em linguagem comum
> Strict ecosystem documentation quality profile.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Accepted; - **Date**: 2026-07-15.

## Decisão em linguagem comum

AgentsKit owns `ecosystem-documentation-quality-v1.json`, a portable companion profile for
all seven products. A product is certified only when all of these conditions are true:

1. Doc Bridge reports exactly `100`, agent and human ready counts equal their non-zero
   totals, all 7 required rules pass, both recommended rules pass, and no rule is excepted.
2. `llms.txt`, `llms-full.txt`, raw source links, and a `for-agents` surface are present.
3. README, human docs, and agent docs form one narrative; the README and selected key
   journeys remain inside explicit word budgets.
4. Every selected key journey records a visual decision. Diagrams, runnable examples,
   animations, and interactives are preferred; `not-applicable` is allowed only with an
   explicit rationale and evidence.
5. Global navigation lists all seven products. The ecosystem continuation component
   Review may use a Markdown equivalent.
6. Documentation, chat, and enterprise hooks point respectively to Doc Bridge, AgentsKit
   and reviewable.

The profile is versioned independently from Documentation Standard v1. The executable
validator returns every failure rather than stopping at the first one. Certification is a
blocking seven-payload matrix: attestations must all be eligible, and the local verification
mode additionally recalculates paths and word counts inside every checked-out repository.
A migration status never counts as certification.

```mermaid
flowchart LR
  Product["Product repository"] --> Bridge["Doc Bridge exact results"]
  Product --> Narrative["README + human docs + for-agents"]
  Product --> Visuals["Visual decisions + examples"]
  Product --> Links["7-product navigation + contextual hooks"]
  Bridge --> Certifier["Documentation quality v1 certifier"]
  Narrative --> Certifier
  Visuals --> Certifier
  Links --> Certifier
  Certifier -->|all exact| Certified["Certified"]
  Certifier -->|any mismatch| Blocked["Blocked with findings"]
```

## Contexto

The seven products share a canonical identity contract, but their documentation quality is
not comparable. A rounded Doc Bridge score can display `100/100` while exact handoff
coverage is lower, and the stable Documentation Standard v1 intentionally checks a compact
baseline rather than the whole ecosystem experience. Several products also expose
`llms.txt` without `llms-full.txt`, omit a `for-agents` entry point, hide siblings, or rely
on long prose where a diagram or runnable example would communicate faster.

Changing the meaning of Documentation Standard v1 in place would surprise existing Doc
Bridge consumers. The ecosystem needs a separate certification layer that composes the
stable standard with stricter, fail-closed requirements.

## Consequências

### Positive

- A displayed score can no longer substitute for exact coverage.
- Machine and human documentation are certified together.
- Sparse pages, bloated journeys, missing visuals, and broken ecosystem discovery produce
  actionable failures.
- Repository-native products remain representable without inventing a Fumadocs deployment.

### Negative

- Each repository must generate and refresh a small evidence payload.
- Editorial review remains necessary to approve `not-applicable` visual and contextual-hook
  decisions.
- Local full verification requires all six repositories to be checked out together.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0023-ecosystem-documentation-quality.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0023-ecosystem-documentation-quality.md:1`
