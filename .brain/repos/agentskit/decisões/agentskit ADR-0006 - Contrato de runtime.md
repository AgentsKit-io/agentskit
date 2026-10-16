---
tipo: adr
repo: agentskit
camada: framework
visibilidade: publico
status: aceito
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura integral da decisão fonte"
fontes: ["docs/architecture/adrs/0006-runtime-contract.md"]
tags: [adr, repo/agentskit, camada/framework]
---

# agentskit ADR-0006 - Contrato de runtime

> [!tldr] Em linguagem comum
> Contrato de runtime: o que o laço de execução de agentes precisa cumprir (invariantes RT1–RT14). O texto da decisão está em inglês na fonte.

← [[00 Decisões - agentskit]]

## Status e datas

- **Status**: aceito (`Accepted` na fonte). **Data**: 2026-04-14.

## Decisão em linguagem comum

A configuration-and-call contract, not a class hierarchy. One factory (`createRuntime`), three types (`RuntimeConfig`, `RunOptions`, `RunResult`), explicit invariants on the loop's behavior.

### Core types

```ts
export interface DelegateConfig {
  skill: SkillDefinition
  tools?: ToolDefinition[]
  adapter?: AdapterFactory
  maxSteps?: number
}

export interface RuntimeConfig {
  adapter: AdapterFactory
  tools?: ToolDefinition[]
  systemPrompt?: string
  memory?: ChatMemory
  retriever?: Retriever
  observers?: Observer[]
  maxSteps?: number
  temperature?: number
  maxTokens?: number
  delegates?: Record<string, DelegateConfig>
  maxDelegationDepth?: number
  onConfirm?: (toolCall: ToolCall) => MaybePromise<boolean>
}

export interface RunOptions {
  tools?: ToolDefinition[]
  systemPrompt?: string
  skill?: SkillDefinition
  maxSteps?: number
  signal?: AbortSignal
  delegates?: Record<string, DelegateConfig>
  sharedContext?: SharedContext
}

export interface RunResult {
  content: string
  messages: Message[]
  steps: number
  toolCalls: ToolCall[]
  durationMs: number
}
```

### Invariants

**RT1. Construction is configuration only.** `createRuntime(config)` MUST NOT perform I/O, open connections, or call the adapter. All work is deferred to `run()`. Same rationale as Adapter A1 — enables fast startup, easy testing, no surprise side effects from importing.

**RT2. Run is the only entry point.** A runtime exposes `run(task, options?)` returning `Promise<RunResult>`. There is no `start`, no `init`, no `step`. Streaming events come through observers (RT9), not through additional methods. This keeps the surface tiny and the substitutability strong.

**RT3. Options override config, never silently merge.** When both `RuntimeConfig` and `RunOptions` specify the same field (e.g., `maxSteps`, `tools`, `systemPrompt`), the option wins. The runtime MUST NOT silently union arrays or merge objects unless explicitly documented (the only exception is `tools`, which unions config + options + skill-derived; see RT5).

**RT4. The loop has hard bounds.** Every run terminates in one of:
- A natural completion (model emits `done` chunk with no further tool calls)
- `maxSteps` reached (default sensible value, recommended ≤ 10)
- `signal.aborted` becoming true
- An unrecoverable error thrown from an adapter, tool, or memory call

The runtime MUST NOT loop forever. `maxSteps` is a hard cap, not a soft suggestion.

**RT5. Tool resolution is well-defined.** When the model emits a tool call, the runtime resolves the tool name in this order: (1) `RunOptions.tools`, (2) `RuntimeConfig.tools`, (3) tools contributed by an active skill via `onActivate` (S9). Last-wins on name collision within each scope; later scopes shadow earlier (option overrides config). A name not found in any scope produces a tool error chunk back to the model — the runtime MUST NOT throw.

**RT6. Tool execution respects confirmation.** When a tool has `requiresConfirmation: true` (Tool T9) AND `onConfirm` is configured, the runtime MUST call `onConfirm(toolCall)` and only execute if it returns `true`. If `onConfirm` is not configured AND the tool requires confirmation, the runtime MUST refuse execution and emit a tool error explaining the missing approver. There is no "default to allow" or timeout-based approval.

**RT7. Memory is read-then-write.** When `memory` is configured, the runtime MUST `load()` chat history into the conversation prefix before sending to the adapter, and MUST `save()` the updated history after the run completes successfully. Aborted or failed runs MUST NOT save (the chat memory contract CM4 requires atomicity from the consumer's view).

**RT8. Retrieval is per-turn, not per-step.** When `retriever` is configured, the runtime MUST call `retrieve` once per `run()` invocation (not once per loop step) using the original task as the query. Retrieved documents are inserted into the system prompt or as a context message — the placement is implementation-defined but consistent within a runtime version.

**RT9. Observers see everything, change nothing.** Observers (per the Observer contract — referenced, defined elsewhere) receive events for: model start/end, chunk received, tool call detected, tool execution start/end, delegation start/end, run start/end, error. Observers are read-only. They MUST NOT mutate messages, tool calls, or results. They MAY have side effects (logging, tracing, metric emission). Failures in observers MUST NOT propagate; the runtime catches and logs.

**RT10. Delegation is a tool, not a special case.** When `delegates` are configured, each delegate is materialized as a tool the model can call (`delegate_<name>`). The model treats delegation as just another tool call. Inside the delegate tool's `execute`, the runtime instantiates a new run with the delegate's config (recursive call), tracking depth.

**RT11. Delegation depth is bounded.** `maxDelegationDepth` (default 3) is the maximum recursive depth of delegate calls. At depth equal to the limit, the runtime MUST NOT materialize delegate tools (delegates simply don't appear). This prevents infinite chains and is a behavioral cap, not just a number — the runtime stops offering delegation at the limit.

**RT12. Run produces a deterministic result shape.** `RunResult` MUST contain: final assistant text (`content`), full message history including all turns (`messages`), step count (`steps`), every tool call with its result (`toolCalls`), and elapsed wall time (`durationMs`). These fields are non-negotiable; additional fields MAY be added in metadata if needed.

**RT13. Abort is prompt and clean.** When `signal.aborted` becomes true, the runtime MUST: (a) abort any in-flight adapter stream, (b) stop the loop after the current step, (c) skip the memory `save`, (d) emit a `run-aborted` event to observers, (e) reject the `run` promise with an `AbortError`. Resources opened by tools (file handles, network connections) are the tool's responsibility to clean up — see Open Questions on tool cancellation.

**RT14. Errors are categorized.** The runtime distinguishes:
- **Adapter errors** (provider returned an error chunk per A9) → loop terminates, error in result
- **Tool errors** (tool returned `{ error }` per T11 or threw) → fed back to model as a tool result, loop continues
- **Confirmation refusals** → fed back as a tool error explaining refusal, loop continues
- **Memory/retriever errors** → loop terminates, error propagated
- **Programmer errors** (bad config, missing required field) → thrown synchronously from `createRuntime` or at the start of `run`

This categorization MUST be reflected in observer events.

### Versioning and stability

- **Tier**: `stable` (with explicit forward-compat carve-outs below)
- **Version**: v1, semver'd independently of packages
- **Forward-compat carve-outs**: durability checkpoints (#156), replay hooks (#134), and topology helpers (#157) will land as additive in v1.x; they do NOT require v2.

## Contexto

The **Runtime** is where everything composes. It owns the loop: take a task, send it to the adapter, parse tool calls, execute tools, feed results back, decide when to stop. It also owns multi-agent delegation, observability event emission, memory persistence, RAG retrieval, and confirmation gating.

In other words: every prior ADR (Adapter, Tool, Memory, Retriever, Skill) is a **substrate**. The Runtime is the **conductor**.

This makes the Runtime the most consequential contract to formalize. It is also the most opinionated — there is no "neutral" runtime; every loop encodes assumptions about when to stop, how to handle errors, how to delegate, what observability looks like.

Today the contract lives in `packages/runtime/src/types.ts` (`RuntimeConfig`, `RunOptions`, `RunResult`) plus the implementation in `packages/runtime/src/runner.ts` and shared primitives in `packages/core/src/agent-loop.ts`. Two upcoming concerns force formalization:

- **Multi-agent topologies (#157)** — supervisor/swarm/hierarchical/blackboard all build on this contract
- **Durable execution (#156)** — agents that survive crashes need a runtime-level checkpoint primitive
- **Deterministic replay (#134)** — replay must be a runtime feature, not a userland workaround

This ADR defines the Runtime contract at v1: enough to lock down the substrate consumers depend on, while leaving room for durability, replay, and topologies to land as additive features.

## Consequências

### Positive
- Multi-agent topologies (#157) are built by configuring `delegates`. Supervisor: one runtime with delegates. Swarm: every runtime delegates to every other. Hierarchical: depth = nesting. No new contract needed.
- Durable execution (#156) becomes a wrapper runtime: same `run()` signature, persists state at each step, resumes from checkpoint. Pure addition.
- Deterministic replay (#134) becomes a runtime + adapter pair: replay adapter feeds recorded chunks, replay runtime asserts the loop matches the recorded trace.
- Sandbox runtime (#163): same `run()`, internally wraps every tool's `execute` in the sandbox. Transparent to consumers.
- Testing is easy: a mock adapter (per ADR 0001) plus a fresh runtime per test.
- Observer-based observability (#150 trace viewer, Langfuse/PostHog integrations) plugs in without runtime changes.

### Negative
- **No per-step retrieval in v1.** ReAct-style "retrieve on every iteration" requires a custom runtime or a tool-shaped retriever. Acceptable; we'll see how often it's actually needed.
- **No mutating middleware.** A runtime that wants to rewrite tool calls before execution (e.g., for security policies) cannot use observers. They'd need to either wrap the runtime or wait for a middleware contract. We accept this for v1.
- **Delegation depth is global, not per-branch.** Two delegates at depth 1 each get `maxDelegationDepth - 1` more levels; we don't track per-path budgets. Simpler, occasionally wasteful.
- **`sharedContext` is opaque to the contract.** It's an escape hatch for delegate-to-delegate state passing; a future ADR may formalize.

## Pacotes afetados

- [[agentskit-runtime]] — implementa o contrato.
- [[agentskit-core]], [[agentskit-sandbox]].

Lista derivada das notas de pacote desta auditoria (seção "Decisões e história"); não é lista oficial do ADR.

## Substitui / substituído por

- **Supersedes**: —

## Fonte

`docs/architecture/adrs/0006-runtime-contract.md:1`
