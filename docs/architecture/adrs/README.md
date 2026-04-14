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

Every ADR follows the template below. See `0001-adapter-contract.md` for an example.

```markdown
# ADR NNNN — Title

- Status: Proposed | Accepted | Superseded by ADR XXXX
- Date: YYYY-MM-DD
- Supersedes: —
- Related issues: #NNN

## Context
Why this decision is needed.

## Decision
The concrete decision, including interfaces, invariants, and semver/stability tier.

## Rationale
Why this choice over the alternatives.

## Consequences
Positive and negative outcomes accepted.

## Alternatives considered
What we rejected and why.

## Open questions
What is intentionally left for future ADRs.

## References
```

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-adapter-contract.md) | Adapter contract (v1) | Accepted |

Upcoming (tracked in #214):

- 0002 — Tool contract
- 0003 — Memory contract
- 0004 — Retriever contract
- 0005 — Skill contract
- 0006 — Runtime contract
