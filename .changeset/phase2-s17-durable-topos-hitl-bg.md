---
'@agentskit/runtime': minor
'@agentskit/core': minor
---

Phase 2 sprint S17 — issues #156, #157, #158, #159.

- `@agentskit/runtime` — `createDurableRunner` + `StepLogStore`
  contract + `createInMemoryStepLog` / `createFileStepLog`.
  Temporal-style durable execution: wrap side effects in
  `runner.step(id, fn)`, resume transparently after crashes.
- `@agentskit/runtime` — `supervisor` / `swarm` / `hierarchical` /
  `blackboard` topology builders plus the minimal `AgentHandle`
  interface they compose over. Round-robin / tag-based routing /
  timeouts / user-supplied mergers all built-in.
- `@agentskit/core/hitl` (subpath) — `createApprovalGate` +
  `ApprovalStore` contract + `createInMemoryApprovalStore`.
  Pause / resume / approve with persisted decisions; idempotent
  `request` handles crash-and-resume without duplicate approvals.
- `@agentskit/runtime` — `createCronScheduler` (zero-dep 5-field
  cron + `every:<ms>`) + `createWebhookHandler` (framework-agnostic
  `(req) => res` adapter for Express / Hono / Next). Background
  agents without pulling in a job queue.
