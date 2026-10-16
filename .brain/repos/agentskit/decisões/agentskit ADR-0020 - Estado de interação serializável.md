---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0020 - Estado de interação serializável

> [!tldr] Em linguagem comum
> Serializable interaction state.

← [[00 Decisões - agentskit]]

## Status e datas

- Status: Accepted; - Date: 2026-07-13.

## Decisão em linguagem comum

Create a zero-runtime-dependency `@agentskit/statechart` package with a framework-neutral contract:

- a statechart definition has an identifier, a definition version, an explicit initial state, named states, and event transitions;
- definitions are validated once and frozen by the package;
- instances contain only JSON-compatible context plus machine identity, current state, revision, and host-supplied identity/time metadata;
- transitions are synchronous and pure. They return an `accepted` or `rejected` discriminated union and never perform IO;
- guards and reducers are optional deterministic functions. Exceptions and invalid reducer output become typed rejections;
- context parsing is injected into the definition and is applied at creation, after reduction, and during restore;
- snapshots carry a package-owned schema version and are restored from `unknown` through runtime validation;
- instance IDs and timestamps are supplied by the host. The package does not read a clock or generate randomness;
- observers are notified only through a separate helper after a transition result exists. Observer failure cannot alter transition state.

The package does not provide persistence, effects, action execution, retries, deduplication, business-specific phases, UI components, provider integration, or agent-loop integration.

## Contexto

Interactive agent surfaces need a small way to represent deterministic, resumable interaction state. That concern is narrower than the Runtime flow and durable-execution facilities and independent from Core's `ChatController`: it does not execute agents, call tools, render UI, persist data, or select providers.

Putting this primitive in Core would expand Core's contract and bundle. Putting it in Runtime would couple UI-facing interaction state to an execution engine. Reimplementing it in every framework adapter would produce incompatible snapshots and transition semantics.

## Consequências

- Consumers must provide an instance ID, timestamps, and a context parser.
- Guards and reducers must remain deterministic if replay equivalence is required.
- Event delivery deduplication and persistence are host responsibilities.
- Definition functions are runtime configuration and are not part of serialized snapshots.
- The initial release is alpha while downstream framework integrations exercise the contract.
- Runtime flows remain the correct abstraction for durable execution, DAGs, tool calls, and side effects.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0020-serializable-interaction-state.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0020-serializable-interaction-state.md:1`
