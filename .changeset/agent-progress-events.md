---
"@agentskit/core": minor
"@agentskit/ink": minor
---

Add agent progress events + a headless progress renderer (RFC 0005).

- `@agentskit/core`: new additive `AgentEvent` variant `{ type: 'progress'; label; status: 'start' | 'ok' | 'skip' | 'error'; detail?; durationMs? }`, so multi-stage agents can emit their own domain stages through the standard `observers` channel.
- `@agentskit/ink`: `createProgressObserver()` — a headless ANSI spinner renderer for standalone (non-chat) agent runs, plus the shared `SPINNER_FRAMES` export.
