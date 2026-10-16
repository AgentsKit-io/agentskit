---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0039-cryptographic-ids.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0039 - IDs criptográficos para identificadores gerados

> [!tldr] Em linguagem comum
> IDs criptográficos para identificadores gerados pelo ecossistema. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-09-29.

## Decisão em linguagem comum

`@agentskit/core` exposes `createId(prefix)`, which returns the prefix and a
UUID from the platform's `crypto.randomUUID()`. Existing `generateId(prefix)`
keeps its export and prefix contract while delegating to `createId`. Packages
that need generated run, server, or temporary-file IDs use this helper.

## Contexto

Generated IDs across packages used timestamps, counters, or `Math.random()`.
Those approaches do not provide a single collision-resistant contract and can
produce IDs with different formats.

## Consequências

- Generated IDs share the UUID v4 format and require a runtime with
  `crypto.randomUUID()`.
- Existing identifiers remain valid strings with their original prefixes,
  but the suffix format changes from timestamp/counter to UUID.
- IDs are not deterministic. Callers needing stable identifiers must supply
  them explicitly.

## Pacotes afetados

- [[agentskit-core]] (`createId`, `generateId`), [[agentskit-runtime]] (IDs de execução de fluxo).

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0039-cryptographic-ids.md:1`
