---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0019-cancellable-chat-memory-operations.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0019 - Operações canceláveis de ChatMemory

> [!tldr] Em linguagem comum
> Cancellable ChatMemory operations.

← [[00 Decisões - agentskit]]

## Status e datas

Status não encontrado.; Data não encontrada..

## Decisão em linguagem comum

Add an optional `MemoryOperationOptions` argument with `signal?: AbortSignal` to `ChatMemory.load`, `save`, and `clear`. The change is additive: existing implementations and callers remain compatible. Implementations must fail promptly when the signal is already aborted and should forward it when their underlying client supports cancellation.

## Contexto

Server and edge request lifecycles have deadlines and disconnect signals, but `ChatMemory` operations could not receive an `AbortSignal`. Remote or host-provided memory backends therefore had no standard way to stop work after their caller was gone.

## Consequências

- Request-scoped hosts can propagate one cancellation boundary through message IO.
- Backends whose SDK cannot cancel an in-flight command still check before starting; callers may additionally race their deadline.
- No runtime dependency or default timeout is added to Core.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0019-cancellable-chat-memory-operations.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

—

## Fonte

`docs/architecture/adrs/0019-cancellable-chat-memory-operations.md:1`
