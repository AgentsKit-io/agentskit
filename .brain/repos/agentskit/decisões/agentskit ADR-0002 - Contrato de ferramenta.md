---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0002-tool-contract.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0002 - Contrato de ferramenta

> [!tldr] Em linguagem comum
> Tool Contract.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: Accepted; - **Date**: 2026-04-14.

## Decisão em linguagem comum

The Tool contract consists of three types plus invariants that govern construction, execution, and lifecycle.

### Core types

```ts
export type ToolCallStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'error'
  | 'requires_confirmation'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  result?: string
  error?: string
  status: ToolCallStatus
}

export interface ToolExecutionContext {
  messages: Message[]
  call: ToolCall
}

export interface ToolDefinition {
  name: string
  description?: string
  schema?: JSONSchema7
  requiresConfirmation?: boolean
  execute?: (
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ) => MaybePromise<unknown> | AsyncIterable<unknown>
  init?: () => MaybePromise<void>
  dispose?: () => MaybePromise<void>
  tags?: string[]
  category?: string
}
```

### Invariants

**T1. Name is identity.** `name` MUST be unique within a registry and MUST match `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$`. It is the only stable identifier; consumers reference tools by name, never by object identity.

**T2. Schema is the contract.** If `schema` is present, it MUST be a valid JSON Schema 7 describing the `args` object. The schema is the authoritative description of the tool's inputs for both the model and any validation layer. If `schema` is absent, the tool accepts no structured arguments.

**T3. Arguments are validated at the boundary.** The runtime MUST validate `args` against `schema` (when present) before calling `execute`. A validation failure produces a `ToolCall` with `status: 'error'` and an `error` explaining the mismatch — `execute` is NOT called.

**T4. Execute is optional.** A `ToolDefinition` without `execute` is a **declaration**: a tool the model can call for which the caller (usually a client or MCP bridge) is responsible for handling. Registries MUST still list declarations so models see them.

**T5. Execute returns serializable output.** The return value of `execute` (or each yielded value from an `AsyncIterable`) MUST be JSON-serializable. The runtime converts the result to a string for the model. Non-serializable values (functions, class instances with private state, circular refs) are a contract violation.

**T6. Streaming execution.** When `execute` returns an `AsyncIterable`, each yielded value represents a progress update. The final yielded value is the result. Consumers treat partial values as informational; only the last one is recorded as `result`.

**T7. Idempotent init.** `init()`, when present, MUST be idempotent and safe to call concurrently. The runtime may call it once per process, once per tool instance, or once per registry — implementations cannot assume a specific count.

**T8. Dispose is best-effort.** `dispose()`, when present, MAY throw or time out; the runtime treats failures as warnings, not errors. Tools MUST NOT rely on `dispose` being called in crash scenarios.

**T9. Confirmation gates execution.** When `requiresConfirmation` is `true`, the runtime MUST set `status: 'requires_confirmation'` and pause before calling `execute`. A human (or supervising agent) must explicitly approve — implicit timeout-based approval is a contract violation.

**T10. No implicit side effects at definition time.** Constructing a `ToolDefinition` (the object literal) MUST NOT perform I/O or mutate global state. All side effects belong in `init` or `execute`. This enables static tool discovery, bundling, and registry inspection.

**T11. Error as status, not exception.** A tool that fails during `execute` SHOULD report the failure by returning or yielding `{ error: string }` and letting the runtime set `status: 'error'`. Throwing is acceptable but reserved for unexpected bugs — well-behaved tools fail gracefully.

**T12. Tags are advisory.** `tags` and `category` are metadata for discovery and UI (filtering, grouping). The runtime MUST NOT change behavior based on them.

### Versioning

This is **v1** of the Tool contract. Changes follow the same policy as ADR 0001:

1. New ADR supersedes this one
2. Major bump of `@agentskit/core`
3. Deprecation cycle per the Semver Policy (forthcoming)

### Stability tier

- **Tier**: `stable`
- **Guarantee**: Types and invariants will not change without a major bump and migration path.

## Contexto

A **Tool** is a function the model can request by name, with JSON-schema-typed arguments. Tools are the primary mechanism by which an agent acts on the world: reading files, searching the web, calling APIs, executing code, editing documents.

Today the contract lives in `packages/core/src/types/tool.ts` and is implicit in `packages/tools/src/*`. Before Fase 3 adds dozens of tools (GitHub, Linear, Slack, Google Workspace, Stripe, databases, browser, etc.) and before the MCP bridge (#167) publishes/consumes tools across ecosystems, we need a formal, versioned contract.

The Tool contract must also align cleanly with MCP's tool spec so the bridge is a trivial mapping, not a translation layer.

## Consequências

### Positive
- MCP bridge (#167) is a thin mapping: MCP tool → `ToolDefinition` with `execute: undefined`, and vice versa.
- `AdapterFactory` can accept `tools: ToolDefinition[]` in `AdapterContext` (see ADR 0001) and pass them through to any provider that supports tool calling.
- Static discovery and documentation generation become trivial (T10).
- Sandbox execution (#163 `@agentskit/sandbox`) has a clear boundary: wrap `execute` with the sandbox; leave `schema`, `init`, `dispose` alone.
- Tool composition (#168) works: a macro tool is a `ToolDefinition` whose `execute` orchestrates other tools.

### Negative
- **JSON-only arguments (T5)** excludes Buffer, Date, etc. in the raw contract. Tools that need them must serialize (e.g., dates as ISO strings). This is deliberate — it matches what providers send.
- **No per-invocation authentication in the contract.** Auth is captured at construction time (closure over API keys) or via `metadata` on the call. A future ADR may formalize per-invocation credentials if a strong case emerges.
- **`category` as a single string** is limiting; tags partially mitigate. A richer taxonomy would need a separate ADR.

## Pacotes afetados

Consulte a fonte integral `docs/architecture/adrs/0002-tool-contract.md` para a lista de módulos abrangidos; só associe pacotes explicitamente mencionados no documento.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0002-tool-contract.md:1`
