# Architecture Decision Records (ADRs)

This directory contains the formal, versioned contracts and architectural decisions for AgentsKit.

## What is an ADR?

An **ADR** captures a single, significant decision — a contract, a framework choice, a deliberate trade-off — along with the context that produced it and the consequences we accept. Once accepted, an ADR is immutable: changes happen by writing a new ADR that supersedes the old one.

ADRs are stricter than RFCs. An RFC is a proposal open for discussion; an ADR is the conclusion we have committed to ship.

## When to write an ADR

- A new cross-package contract (Adapter, Tool, Memory, Retriever, Skill, Runtime)
- A breaking change to an existing contract
- A framework or tooling choice with long-term consequences (e.g., Fumadocs over Docusaurus)
- A deliberate trade-off that future contributors would otherwise re-litigate

Do NOT write an ADR for: routine features, bug fixes, internal refactors, or anything already covered by the Manifesto.

## Format

```markdown
# ADR NNNN — Title

- Status: Proposed | Accepted | Superseded by ADR XXXX
- Date: YYYY-MM-DD
- Supersedes: —
- Related issues: #NNN

## Context
## Decision
## Rationale
## Consequences
## Alternatives considered
## Open questions
## References
```

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-adapter-contract.md) | Adapter contract (v1) | Accepted |
| [0002](./0002-tool-contract.md) | Tool contract (v1) | Accepted |
| [0003](./0003-memory-contract.md) | Memory contract (v1) | Accepted |
| [0004](./0004-retriever-contract.md) | Retriever contract (v1) | Accepted |

Upcoming (tracked in #214):

- 0005 — Skill contract
- 0006 — Runtime contract
