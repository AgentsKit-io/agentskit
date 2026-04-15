# ADR 0002 — Tool Contract

- **Status**: Accepted
- **Date**: 2026-04-14
- **Supersedes**: —
- **Related issues**: #214
- **Related ADRs**: [0001 — Adapter contract](./0001-adapter-contract.md)

## Context

A **Tool** is a function the model can request by name, with JSON-schema-typed arguments. Tools are the primary mechanism by which an agent acts on the world: reading files, searching the web, calling APIs, executing code, editing documents.

Today the contract lives in `packages/core/src/types/tool.ts` and is implicit in `packages/tools/src/*`. Before Fase 3 adds dozens of tools (GitHub, Linear, Slack, Google Workspace, Stripe, databases, browser, etc.) and before the MCP bridge (#167) publishes/consumes tools across ecosystems, we need a formal, versioned contract.

The Tool contract must also align cleanly with MCP's tool spec so the bridge is a trivial mapping, not a translation layer.

## Decision

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

## Rationale

- **JSON Schema 7 (T2)** is the lingua franca — OpenAI, Anthropic, MCP, and every major provider already speak it. Adopting anything else would require translation at every boundary.
- **Execute-optional (T4)** is what makes this contract compatible with MCP and with delegated architectures (client-side tools, browser sandboxes, A2A protocol). A declaration-only tool is still a first-class citizen.
- **Streaming via AsyncIterable (T6)** mirrors the Adapter contract (ADR 0001) and gives us progressive tool execution (agent shows "downloading..." while a long tool runs) without a new primitive.
- **Definition-time purity (T10)** is non-negotiable for static analysis, bundling, tree-shaking, and the future skill/tool marketplace.
- **Confirmation is explicit (T9)** — human-in-the-loop (#158) must be trustworthy. Timeouts that auto-approve destroy the guarantee.
- **Schema-first validation (T3)** means consumers can trust `args` in `execute` is already well-formed. This is what unlocks the TypeScript-inference magic in #130 (schema → return type).

## Consequences

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

## Alternatives considered

1. **Class-based tools** (`extends Tool { execute() {} }`). Rejected: kills tree-shaking, forces `new` ceremony, conflicts with T10.
2. **Zod/Valibot schema instead of JSON Schema**. Rejected: JSON Schema is the wire format every provider uses. A Zod-to-JSON-Schema converter lives at the userland edge, not in the contract.
3. **Strict typed return via generics** (`ToolDefinition<TArgs, TResult>`). Considered for a follow-up: good DX for TypeScript users, but the runtime contract is JSON; formalizing generics needs its own ADR.
4. **Separate `declare` and `define` constructors**. Rejected: `execute` being optional conveys the same intent with half the surface area.
5. **Confirmation via middleware** (ambient approver rather than a tool flag). Rejected: puts security-critical gating far from the tool that needs it. Explicit flag on the definition is reviewable.

## Open questions (future work)

- **Typed return values**: a follow-up ADR may introduce `ToolDefinition<TArgs, TResult>` with schema-derived `TArgs` and a result schema for `TResult`. This is what makes #130 (schema → return type) fully sound.
- **Tool composition primitives**: macro tools (T+T → T) are possible today but lack a standard combinator. #168 will likely introduce one.
- **Progress protocol for AsyncIterable (T6)**: we do not currently distinguish a "heartbeat" yield from a "partial result" yield. A light progress schema (`{ kind: 'progress', message: string }` vs `{ kind: 'result', ... }`) may emerge.
- **Rate limiting and retries**: currently the consumer's responsibility. A standard retry/backoff annotation on `ToolDefinition` may emerge once we have N tools and see common patterns.
- **Auth-per-invocation**: if enough real tools need per-user credentials (e.g., GitHub-on-behalf-of-X), a formal `credentials` channel will be added.

## References

- Current implementation: `packages/core/src/types/tool.ts`
- Tool implementations: `packages/tools/src/*` (filesystem, shell, web-search)
- Related contracts: ADR 0001 (Adapter), upcoming ADR 0003 (Memory), ADR 0005 (Skill), ADR 0006 (Runtime)
- External: [MCP tools spec](https://modelcontextprotocol.io/specification/server/tools), [JSON Schema 7](https://json-schema.org/draft-07/schema)
- Manifesto principles 3 (interop), 4 (zero lock-in), 7 (TypeScript rigor, schema-first)
