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
| [0005](./0005-skill-contract.md) | Skill contract (v1) | Accepted |
| [0006](./0006-runtime-contract.md) | Runtime contract (v1) | Accepted |
| [0007](./0007-docs-platform-fumadocs.md) | Documentation platform: Fumadocs | Accepted |
| [0008](./0008-runtime-validation.md) | Runtime argument validation | Accepted |
| [0009](./0009-composition-rules.md) | Composition & dependency rules | Accepted |
| [0010](./0010-egress-policy.md) | Network egress policy (safeFetch) | Accepted |
| [0011](./0011-inbound-validation.md) | Inbound request validation (chat triggers) | Accepted |
| [0012](./0012-vendor-adapter-scope.md) | Vendor adapter scope & granularity | Accepted |
| [0013](./0013-memory-record-runtime-validation.md) | Runtime validation for serialized message records | Accepted |
| [0014](./0014-trusted-tool-call-proposal.md) | Trusted application tool-call proposal | Accepted |
| [0015](./0015-tool-authorization-hook.md) | Tool authorization before proposal and execution | Accepted |
| [0019](./0019-cancellable-chat-memory-operations.md) | Cancellable ChatMemory operations | Accepted |
| [0020](./0020-ecosystem-manifest-and-claims.md) | Versioned ecosystem manifest and evidence-backed claims | Proposed |

The 6 core contracts are formalized. Future ADRs will cover specific decisions (semver policy, licensing strategy, etc.) rather than additional foundational contracts.
