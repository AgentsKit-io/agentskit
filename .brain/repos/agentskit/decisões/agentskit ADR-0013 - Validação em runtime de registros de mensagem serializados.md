---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0013-memory-record-runtime-validation.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados

> [!tldr] Em linguagem comum
> Validação em tempo de execução de registros de mensagem serializados, pela função `validateMemoryRecord` do core. O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-07-11.

## Decisão em linguagem comum

Core exports `validateMemoryRecord(input: unknown): MemoryRecord` from the tree-shakeable `@agentskit/core/memory-validation` subpath, keeping the main entrypoint size unchanged.

The function validates version 1 records and the complete serialized message graph, including content parts, tool calls, JSON metadata/arguments, and ISO timestamps. JSON containers are walked iteratively with cycle detection and fixed depth/node limits. Invalid input throws `ConfigError` with `AK_CONFIG_INVALID`; raw values are not included in the public message.

`deserializeMessages` remains backward compatible and does not implicitly validate. Trust-boundary callers explicitly validate before deserializing.

## Contexto

`@agentskit/core` exports the canonical `MemoryRecord`, `Message`, `ContentPart`, and `ToolCall` contracts plus serialization helpers. Consumers that receive a serialized record from storage or a network boundary currently have no canonical runtime validator. Reconstructing the message graph in downstream schema libraries causes drift, while casting untrusted data makes `deserializeMessages` unsafe at boundaries.

Core must remain zero-dependency, browser/edge compatible, and under its bundle budget. Recursive validators can also overflow or consume unbounded work on cyclic or deeply nested metadata and tool arguments.

## Consequências

- Downstream transports reuse one canonical runtime validator.
- Existing serialization and deserialization behavior remains compatible.
- Validation is bounded and safe for untrusted object graphs.
- Core bundle size increases slightly and remains subject to the existing size gate.

## Pacotes afetados

- [[agentskit-core]] (`@agentskit/core/memory-validation`), [[agentskit-memory]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- Supersedes: —

## Fonte

`docs/architecture/adrs/0013-memory-record-runtime-validation.md:1`
