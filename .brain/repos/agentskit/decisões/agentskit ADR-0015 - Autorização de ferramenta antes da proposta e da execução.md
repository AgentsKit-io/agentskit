---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0015-tool-authorization-hook.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução

> [!tldr] Em linguagem comum
> Autorização de ferramenta antes da proposta e da execução, pelo hook `ToolAuthorizer` do core. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-07-11.

## Decisão em linguagem comum

`ChatConfig.authorizeToolCall` is an optional host callback. It receives the canonical `ToolCall`, registered tool, current messages, and a phase: `propose` or `execute`. It returns `{ allowed, reason? }`.

The controller calls it before committing model-originated and trusted application proposals, and again immediately before any execution. Missing authorizers preserve existing behavior. A denial or callback failure defaults to `AK_TOOL_FORBIDDEN`; denied proposals never enter confirmation state and denied executions never invoke the tool.

Trusted identity and capability context remain closure-owned by the host. AgentsKit passes no user-supplied authorization claims and stores no policy engine.

## Contexto

Tool argument validation and human confirmation do not answer whether the current trusted principal may use a tool. Model text and client payloads cannot be authorization sources. Downstream tool wrappers would apply policy inconsistently and duplicate controller lifecycle behavior.

## Consequências

- Every controller and framework binding shares the same enforcement points.
- Execution-time checks prevent capability revocation races.
- Hosts own policy decisions and their audit/trace storage.
- The authorization implementation is lazy-loaded to preserve the core size budget.

## Pacotes afetados

- [[agentskit-core]] (`ToolAuthorizer`, `src/index.ts:83-86`).

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0015-tool-authorization-hook.md:1`
