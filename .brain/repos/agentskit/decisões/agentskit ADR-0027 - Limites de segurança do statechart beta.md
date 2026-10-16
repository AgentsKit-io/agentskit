---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0027-statechart-beta-boundaries.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0027 - Limites de segurança do statechart beta

> [!tldr] Em linguagem comum
> Limites de segurança do statechart beta: entradas JavaScript hostis, como chaves sensíveis a protótipo, arrays esparsos e observadores assíncronos.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-07-17.

## Decisão em linguagem comum

The statechart beta contract adds these boundaries:

- state and event lookup maps use null prototypes, so every valid string key is data and cannot mutate a prototype;
- the package's JSON clone accepts finite JSON values, normalizes negative zero, and requires dense undecorated arrays and ordinary data objects;
- symbol properties, array decorations, accessors, unsupported prototypes, and unsafe proxy inspection are rejected without intentionally invoking getters;
- snapshot restore remains a total operation over `unknown`: malformed input returns a frozen typed rejection instead of throwing;
- malformed events, invalid host metadata, and revisions that cannot increment within JavaScript's safe-integer range use `AK_STATECHART_INPUT_INVALID`;
- guards and reducers receive deeply frozen event and context values;
- observer callbacks are synchronous. A returned thenable is caught and reported as `AK_STATECHART_OBSERVER_FAILED`, including prevention of an unhandled rejection;
- the package remains zero-runtime-dependency and owns neither persistence nor effects.

Invalid event rejections expose only a sanitized event shape. They do not echo values that failed the JSON boundary.

## Contexto

ADR 0020 established a dependency-free interaction-state contract with pure transitions and runtime-validated snapshots. Beta consumers need the boundary to remain deterministic when JavaScript inputs contain prototype-sensitive keys, sparse or decorated arrays, accessors, proxies, invalid host metadata, exhausted revisions, or asynchronous observer callbacks.

Ordinary object maps mishandle valid keys such as `__proto__`. JSON serialization silently changes sparse arrays, accessors can execute while validation is inspecting untrusted data, and a promise returned from a callback typed as `void` can reject outside synchronous error isolation. These are contract questions rather than implementation-only details because consumers depend on the exact accepted and rejected input sets.

## Consequências

- Sparse arrays and objects with behavior-bearing properties must be normalized by the host before entering the package.
- Revisions stop at `Number.MAX_SAFE_INTEGER`; the host must rotate or migrate an instance rather than accept an ambiguous next revision.
- Async telemetry belongs behind a synchronous handoff owned by the host; it is not awaited by this package.
- The new input diagnostic and stricter accepted-input set ship in a new `0.x` minor.
- With packaging, adversarial tests, and documentation aligned, `@agentskit/statechart` graduates from alpha to beta. Stable promotion still requires the repository's published-minor, soak, evidence, and dependency gates.

## Pacotes afetados

- [[agentskit-statechart]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0027-statechart-beta-boundaries.md:1`
