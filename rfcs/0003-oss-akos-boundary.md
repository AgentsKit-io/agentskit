# RFC 0003 — OSS / AKOS product boundary

- **Status**: Accepted
- **Date**: 2026-06-09
- **Author**: @EmersonBraun
- **Related issues**: —
- **Related PRs**: RFC 0002 (#925), agentskit-registry repo

## Summary

Draw the line between what ships **free and open-source** (the AgentsKit
framework, the agent registry, integrations, tools, skills) and what AgentsKitOS
(**AKOS**) keeps as the commercial layer (orchestration-as-a-service, egress
enforcement, RBAC, multi-tenant, licensing, managed deployment, marketplace
billing). AKOS **consumes** the OSS surface — it never re-ships agents or
integrations. This makes AKOS lighter and makes the OSS the canonical home for
all reusable agent building blocks.

## Motivation

AKOS historically bundled its own agent definitions (the `pack-bundle`
StarterAgents per vertical) and its own integration wrappers. That duplicates
what the OSS framework already does, bloats AKOS, and splits maintenance.

The strategy: **everything reusable is free and open** (agents, integrations,
tools, skills, runtime primitives). AKOS earns its keep purely on the
**enterprise control plane** — the things a business actually pays for.
Each agent or integration moved to OSS is an install surface (adoption) *and* a
publicly-validated building block that AKOS can compose with confidence.

## Decision

### OSS owns (free, MIT)

- **Agents** — the registry (`agentskit-registry`, RFC 0002). Each agent is a
  portable "brain": a skill (system prompt) + a capability-pass-through factory
  (`tools`, `memory`, `retriever`, `delegates`, `onConfirm`, `observers`).
- **Integrations** — `@agentskit/integrations` (single OSS package; the ~40
  service connectors, previously duplicated in AKOS).
- **Tools, skills, runtime primitives** — `@agentskit/tools`, `@agentskit/skills`,
  `@agentskit/runtime` (ReAct loop, topologies `supervisor`/`swarm`/`hierarchical`/
  `blackboard`, delegates), `@agentskit/memory`, `@agentskit/rag`, adapters, eval.
- **Interop** — A2A AgentCards and (planned) an MCP server exposing the above.

### AKOS owns (commercial)

- **Orchestration-as-a-service** — hosted, durable, multi-agent runs at scale;
  scheduling, retries, queues, the visual harness/desktop.
- **Egress enforcement** — outbound-traffic policy/guard at the platform edge.
- **RBAC & identity** — tenant roles, per-action authorization, approval routing.
- **Multi-tenant & licensing** — workspaces, license lifecycle, white-label/OEM
  packs, the marketplace + billing.
- **Managed deployment & compliance** — hosting, audit ledger, data residency,
  enterprise SSO.

### The consumption contract (how AKOS uses OSS without duplicating)

The OSS agent factory's optional config **is** the AKOS injection surface:

| OSS agent config | AKOS injects |
|------------------|--------------|
| `tools` | egress-wrapped / policy-checked tool instances |
| `onConfirm` | the RBAC / approval gate |
| `delegates` | the hosted orchestrator's sub-agents |
| `observers` | the audit ledger / tracing sink |
| `memory` / `retriever` | tenant-scoped, residency-aware stores |

So an OSS agent is the provider- and infra-agnostic behavior; AKOS wraps it with
the enterprise control plane. The AKOS-specific `capabilities` (e.g. `hitl:decide`,
`security:redact`) stay in AKOS — they describe platform permissions, not agent
behavior, and are intentionally absent from the OSS port.

## Migration

1. **Agents** — the AKOS `pack-bundle` StarterAgents are ported to the registry
   (done: 43 agents, 8 verticals, provenance `source: agentskit-os`, MIT). AKOS
   stops shipping its own definitions and composes registry agents.
2. **Integrations** — consolidate AKOS's connectors into `@agentskit/integrations`;
   AKOS imports them (in progress).
3. AKOS keeps only the control-plane packages (`os-security`, `os-egress-guard`,
   `os-license`, `os-whitelabel`, orchestrator, desktop, marketplace).

## Consequences

### Positive

- AKOS gets lighter — control plane only; no agent/integration maintenance.
- OSS becomes the canonical, growing home for reusable building blocks → real
  installs/downloads.
- Every agent/integration is publicly validated before AKOS depends on it.
- Clear story: OSS = build blocks free; AKOS = run it safely at enterprise scale.

### Negative

- AKOS must track OSS versions (consume published packages / registry).
- Requires discipline: no new agent/integration logic lands in AKOS; it goes OSS first.

### Neutral

- The boundary is a product decision, not a code contract — enforced by review
  and by AKOS depending on published OSS artifacts rather than forking them.
