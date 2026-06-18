# RFC 0005 — Agent progress events + a headless progress renderer

- **Status**: Proposed
- **Date**: 2026-06-17
- **Author**: @EmersonBraun
- **Related packages**: `@agentskit/core`, `@agentskit/ink`, `@agentskit/runtime`
- **Prototype**: branch `feat/agent-progress-events` (this branch)

## Summary

Two small, additive changes so **standalone (non-chat) agents** can report and render multi-stage progress without each one hand-rolling ANSI:

1. **`@agentskit/core`** — add one variant to `AgentEvent`:
   `{ type: 'progress'; label: string; status: 'start' | 'ok' | 'skip' | 'error'; detail?: string; durationMs? }`.
   Agents emit their own domain stages (e.g. `classify`, `sanitize`, `publish`) through the **same `observers` channel** as runtime events.
2. **`@agentskit/ink`** — add a headless `createProgressObserver()` that returns an `Observer` rendering those events as an animated spinner line (ANSI, no React render tree), reusing the chat UI's braille `SPINNER_FRAMES`.

No new callback, no new contract surface. One channel (`observers`) for runtime + domain events; one renderer any standalone agent can drop in.

## Motivation

The runtime already has a progress channel: `observers: Observer[]` receiving `AgentEvent`s (`llm:start`, `tool:start/end`, `agent:step`, `agent:delegate:*`, `error`). That covers **runtime-level** progress.

But a multi-stage agent's progress is **domain-level** — "classify → sanitize → leak-gate → publish" — which the runtime can't know. Today there is no place for it:

- `AgentEvent` is a **closed union** with no generic/custom variant.
- `agent:step` (`{ step, action }`) is too thin: no `status` (start vs ok vs skip vs error), no `durationMs`, no human label/detail.

So agent authors hand-roll a bespoke `onProgress` callback **and** a bespoke ANSI renderer. Real example — the registry's `knowledge-promoter` agent ships exactly that today:

```ts
// agent config — a one-off callback the framework knows nothing about
onProgress?: (e: { stage; status; detail?; durationMs? }) => void
// …and ~40 lines of ANSI spinner in the consumer (src/reporter.ts)
```

Every standalone/registry agent re-invents both. That is the gap.

## Proposal

### 1. `AgentEvent` gains a `progress` variant (additive, non-breaking)

```ts
export type AgentEvent =
  | …existing variants…
  | { type: 'progress'; label: string; status: 'start' | 'ok' | 'skip' | 'error'; detail?: string; durationMs?: number }
  | { type: 'error'; error: Error }
```

Additive: existing observers already switch on `event.type` and ignore unknown variants. The **runtime never emits this** — only agents do, via the observers they were given:

```ts
const emit = (label, status, detail?, durationMs?) => {
  for (const o of config.observers ?? []) void o.on({ type: 'progress', label, status, detail, durationMs })
}
```

### 2. `@agentskit/ink` gains `createProgressObserver()`

A headless renderer (no Ink/React tree — pure ANSI, works in CI logs too):

```ts
import { createProgressObserver } from '@agentskit/ink'

const agent = createKnowledgePromoterAgent({
  adapter,
  observers: [createProgressObserver()], // ← fancy run, zero hand-rolled ANSI
})
```

It renders each `progress` event as an animated spinner line that resolves to `✓ / – / ⛔` with timing. Reuses `SPINNER_FRAMES` from `ThinkingIndicator`. `{ plain }` falls back to plain lines on non-TTY.

### Before / after for an agent author

```ts
// before: bespoke callback + bespoke renderer per agent
createAgent({ adapter, onProgress: makeMyAnsiReporter() })

// after: standard channel + standard renderer
createAgent({ adapter, observers: [createProgressObserver()] })
```

The agent emits `progress` through `observers`; the renderer is shared. Logging, tracing, and a TUI all consume the same stream.

## Alternatives considered

- **Keep the per-agent `onProgress` callback.** Works, but every agent re-invents the callback shape and the renderer; nothing composes (a logger and a TUI can't share one channel). Rejected — it's the status quo this RFC removes.
- **Overload `agent:step`.** Too thin (no status/duration/label); changing its shape is breaking. Rejected.
- **A full Ink `<AgentRun>` React component.** Useful later, but standalone agents (cron, CI, registry one-liners) have no render tree — the headless ANSI observer fits them. The React component can layer on top of the same event later.

## Prototype & validation

On this branch:
- `packages/core/src/types/agent.ts` — the `progress` variant.
- `packages/ink/src/progress-observer.ts` — `createProgressObserver()` + `SPINNER_FRAMES`.
- `packages/ink/src/progress-observer.test.ts` — renders progress events, ignores non-progress, formats timing/symbols. **Passes.**

The registry `knowledge-promoter` agent stays on its local `onProgress` until core ships this (CONTRIBUTING: published packages only); the one-line migration above lands when it does.

## Rollout

1. Merge the `progress` variant to `@agentskit/core` (patch, additive).
2. Ship `createProgressObserver()` in `@agentskit/ink`.
3. Registry agents migrate `onProgress` → `observers: [createProgressObserver()]` and emit `progress` events. Update the registry agent template + CONTRIBUTING to recommend the pattern.
