# ADR 0006 — Runtime Contract

- **Status**: Accepted
- **Date**: 2026-04-14
- **Supersedes**: —
- **Related issues**: #214
- **Related ADRs**: [0001 — Adapter](./0001-adapter-contract.md), [0002 — Tool](./0002-tool-contract.md), [0003 — Memory](./0003-memory-contract.md), [0004 — Retriever](./0004-retriever-contract.md), [0005 — Skill](./0005-skill-contract.md)

## Context

The **Runtime** is where everything composes. It owns the loop: take a task, send it to the adapter, parse tool calls, execute tools, feed results back, decide when to stop. It also owns multi-agent delegation, observability event emission, memory persistence, RAG retrieval, and confirmation gating.

In other words: every prior ADR (Adapter, Tool, Memory, Retriever, Skill) is a **substrate**. The Runtime is the **conductor**.

This makes the Runtime the most consequential contract to formalize. It is also the most opinionated — there is no "neutral" runtime; every loop encodes assumptions about when to stop, how to handle errors, how to delegate, what observability looks like.

Today the contract lives in `packages/runtime/src/types.ts` (`RuntimeConfig`, `RunOptions`, `RunResult`) plus the implementation in `packages/runtime/src/runner.ts` and shared primitives in `packages/core/src/agent-loop.ts`. Two upcoming concerns force formalization:

- **Multi-agent topologies (#157)** — supervisor/swarm/hierarchical/blackboard all build on this contract
- **Durable execution (#156)** — agents that survive crashes need a runtime-level checkpoint primitive
- **Deterministic replay (#134)** — replay must be a runtime feature, not a userland workaround

This ADR defines the Runtime contract at v1: enough to lock down the substrate consumers depend on, while leaving room for durability, replay, and topologies to land as additive features.

## Decision

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

## Rationale

- **One entry point (RT2)** is the strongest substitutability lever. A test runtime, a replay runtime, a durable runtime, a sandboxed runtime — all expose `run()` and nothing else.
- **No silent merging (RT3)** is what makes runtime behavior debuggable. When something behaves unexpectedly, you can read the resolution order and predict the result.
- **Hard step bound (RT4)** is non-negotiable. Every "infinite loop bug" in agent libraries traces to a soft cap the user can override. We make `maxSteps` a hard cap and let userland choose generous values.
- **Confirmation as refuse-by-default (RT6)** matches Tool T9. The runtime is the right place to enforce this — tools can't enforce their own confirmation because the gate is *before* execute.
- **Memory atomicity (RT7)** preserves the consumer-visible invariant from ADR 0003 CM4. Failed runs must not corrupt history.
- **Retrieval per-turn, not per-step (RT8)** is a deliberate simplification. Per-step retrieval (ReAct-style) is possible but adds complexity for marginal benefit; v1 picks the simpler default. Composite retrievers and multi-step reasoning can still happen via delegation.
- **Observers are read-only (RT9)** is what makes them safe to add freely. A mutating observer is just a middleware in disguise — and middleware deserves its own contract if we ever need it.
- **Delegation as tool (RT10)** unifies the model's mental model: it's all just tool calls. No special syntax for the model, no special parsing in the runtime, no separate event stream.
- **Categorized errors (RT14)** are what enables every meaningful retry/fallback strategy — fallback adapters (#147), self-debug (#177), durable execution (#156). Conflating them defeats the purpose.

## Consequences

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

## Alternatives considered

1. **Class-based runtime** (`new Runtime(config).run(...)`). Rejected: no benefit over a factory function, harder to mock, encourages inheritance.
2. **Streaming run signature** (`AsyncIterableIterator<RunEvent>`). Considered. Observers cover the streaming need without complicating the return type. A future `runStream(task, options)` may be added if real demand emerges; it would be additive.
3. **Per-step hooks instead of observers** (`onStep`, `onToolCall` as config callbacks). Rejected: observers compose (multiple observers, plug-and-play), hooks don't.
4. **No `maxSteps` cap, infinite by default**. Rejected. Universally regrettable in agent libraries. Hard cap with sensible default is right.
5. **Auto-approve confirmation after timeout**. Rejected (matches Tool T9). Security-critical gates must not silently fail-open.
6. **Implicit memory `save` on every step**. Rejected: violates CM4 atomicity. Save once at end (or never, on abort/error) is correct.
7. **Delegation as a separate `delegate(name, task)` method**. Rejected: see RT10. Tool-shaped delegation unifies the model's view.
8. **Multi-method runtime** (`runChat`, `runAgent`, `runWorkflow`). Rejected: same loop, different opinions about when to stop. All can be expressed via skill + tools + delegates.

## Open questions (future work)

- **Tool cancellation semantics** (RT13): when a run aborts, in-flight tool executions continue until they yield. Should the runtime pass the abort signal into tools? Currently they have no way to know. A future v1.x may add `signal` to `ToolExecutionContext`.
- **Per-step retrieval**: open whether to add as a config option, a different runtime, or to leave to userland.
- **Middleware contract**: if mutating the loop becomes a recurring need (security policies, redaction, prompt rewriting), a `Middleware` interface may emerge. Until then, observers + wrapper runtimes are the path.
- **`sharedContext` formalization**: the type exists but the contract is loose. May warrant its own ADR if delegate-to-delegate state becomes a common pattern.
- **Durability checkpoints** (#156): the additive interface for "save state here, resume from there." Designed in v1.x without breaking this contract.
- **Topology helpers** (#157): are supervisor/swarm/hierarchical thin wrappers or do they get their own primitives? TBD.
- **Streaming run** (`runStream`): if demand emerges, add as an additive method.
- **Cost / budget enforcement**: a global token or dollar budget per run is a real production need. Currently a userland concern via observers; may become first-class.

## References

- Current implementation: `packages/runtime/src/types.ts`, `packages/runtime/src/runner.ts`, `packages/core/src/agent-loop.ts`, `packages/core/src/controller.ts`
- Related contracts: ADR 0001 (Adapter — substrate), 0002 (Tool — substrate, T9 confirmation, T11 errors), 0003 (Memory — CM4 atomicity), 0004 (Retriever — substrate), 0005 (Skill — S9 onActivate, S6 delegates)
- Manifesto principles 1 (core is a promise), 2 (plug-and-play), 5 (agent-first, not chat-first), 8 (small, deep, testable modules), 9 (predictable beats clever)
