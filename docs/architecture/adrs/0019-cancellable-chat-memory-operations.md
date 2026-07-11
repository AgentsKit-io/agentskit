# ADR 0019: Cancellable ChatMemory operations

**Status:** Accepted

## Context

Server and edge request lifecycles have deadlines and disconnect signals, but `ChatMemory` operations could not receive an `AbortSignal`. Remote or host-provided memory backends therefore had no standard way to stop work after their caller was gone.

## Decision

Add an optional `MemoryOperationOptions` argument with `signal?: AbortSignal` to `ChatMemory.load`, `save`, and `clear`. The change is additive: existing implementations and callers remain compatible. Implementations must fail promptly when the signal is already aborted and should forward it when their underlying client supports cancellation.

## Consequences

- Request-scoped hosts can propagate one cancellation boundary through message IO.
- Backends whose SDK cannot cancel an in-flight command still check before starting; callers may additionally race their deadline.
- No runtime dependency or default timeout is added to Core.
