# Product Brief

**Audience.** JavaScript/TypeScript developers building agentic software — AI
chat interfaces, standalone agents, tools, skills, memory, RAG, and
observability — across React, terminal (Ink), and CLI.

**Problem.** The JS ecosystem lacks a complete, coherent agent toolkit.
Builders stitch together provider SDKs, ad-hoc tool plumbing, bespoke memory,
and no shared contracts — every project reinvents the foundation and the pieces
don't interoperate.

**Value.** AgentsKit is a plug-and-play, fully interoperable toolkit: a
zero-dependency core of types/events/contracts, with independently installable
packages (adapters, react, ink, cli, runtime, tools, skills, memory, rag,
sandbox, observability, eval, validation) that compose in any combination.
Lightweight, typed, long-term maintainable — built to be the foundation for the
agent era.

**Primary success metric.** Adoption with retention: a developer can build a
working agent (chat or runtime) in one short session using only AgentsKit
packages, and combine any two packages without glue code.

**Non-goals (today).** Hosted/managed runtime, paid inference, and operate-phase
infrastructure (audit ledger, key rotation) — these belong to a future hosted
surface, not the library. See `docs/security/threat-model.md`.
