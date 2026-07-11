# ADR-0015: Tool authorization before proposal and execution

**Status:** Accepted

**Date:** 2026-07-11

## Context

Tool argument validation and human confirmation do not answer whether the current trusted principal may use a tool. Model text and client payloads cannot be authorization sources. Downstream tool wrappers would apply policy inconsistently and duplicate controller lifecycle behavior.

## Decision

`ChatConfig.authorizeToolCall` is an optional host callback. It receives the canonical `ToolCall`, registered tool, current messages, and a phase: `propose` or `execute`. It returns `{ allowed, reason? }`.

The controller calls it before committing model-originated and trusted application proposals, and again immediately before any execution. Missing authorizers preserve existing behavior. A denial or callback failure defaults to `AK_TOOL_FORBIDDEN`; denied proposals never enter confirmation state and denied executions never invoke the tool.

Trusted identity and capability context remain closure-owned by the host. AgentsKit passes no user-supplied authorization claims and stores no policy engine.

## Consequences

- Every controller and framework binding shares the same enforcement points.
- Execution-time checks prevent capability revocation races.
- Hosts own policy decisions and their audit/trace storage.
- The authorization implementation is lazy-loaded to preserve the core size budget.
