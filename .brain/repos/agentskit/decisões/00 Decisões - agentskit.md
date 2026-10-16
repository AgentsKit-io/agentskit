---
tipo: guia
repo: agentskit
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "inventário de docs/architecture/adrs; CLI Doc Bridge indisponível"
fontes: ["docs/architecture/adrs/README.md"]
tags: [decisoes, repo/agentskit, camada/framework]
---

# 00 Decisões - agentskit

> [!tldr] Em linguagem comum
> Índice das decisões arquiteturais que registram contratos e direções do toolkit.

← [[00 Hub - agentskit]]

## Decisões

| Nota | Tema | Fonte |
|---|---|---|
| [[agentskit ADR-0001 - Adapter Contract]] | ADR 0001 — Adapter Contract | `docs/architecture/adrs/0001-adapter-contract.md` |
| [[agentskit ADR-0002 - Tool Contract]] | ADR 0002 — Tool Contract | `docs/architecture/adrs/0002-tool-contract.md` |
| [[agentskit ADR-0003 - Memory Contract]] | ADR 0003 — Memory Contract | `docs/architecture/adrs/0003-memory-contract.md` |
| [[agentskit ADR-0004 - Retriever Contract]] | ADR 0004 — Retriever Contract | `docs/architecture/adrs/0004-retriever-contract.md` |
| [[agentskit ADR-0005 - Skill Contract]] | ADR 0005 — Skill Contract | `docs/architecture/adrs/0005-skill-contract.md` |
| [[agentskit ADR-0006 - Runtime Contract]] | ADR 0006 — Runtime Contract | `docs/architecture/adrs/0006-runtime-contract.md` |
| [[agentskit ADR-0007 - Documentation platform: Fumadocs]] | ADR 0007 — Documentation platform: Fumadocs | `docs/architecture/adrs/0007-docs-platform-fumadocs.md` |
| [[agentskit ADR-0008 - Runtime argument validation]] | ADR 0008 — Runtime argument validation | `docs/architecture/adrs/0008-runtime-validation.md` |
| [[agentskit ADR-0009 - Composition & dependency rules]] | ADR 0009 — Composition & dependency rules | `docs/architecture/adrs/0009-composition-rules.md` |
| [[agentskit ADR-0010 - Network egress policy (safeFetch)]] | ADR 0010 — Network egress policy (safeFetch) | `docs/architecture/adrs/0010-egress-policy.md` |
| [[agentskit ADR-0011 - Inbound request validation (chat triggers)]] | ADR 0011 — Inbound request validation (chat triggers) | `docs/architecture/adrs/0011-inbound-validation.md` |
| [[agentskit ADR-0012 - Vendor adapter scope & granularity]] | ADR 0012 — Vendor adapter scope & granularity | `docs/architecture/adrs/0012-vendor-adapter-scope.md` |
| [[agentskit ADR-0013 - Runtime validation for serialized message records]] | ADR 0013 — Runtime validation for serialized message records | `docs/architecture/adrs/0013-memory-record-runtime-validation.md` |
| [[agentskit ADR-0014 - Trusted application tool-call proposal]] | ADR-0014: Trusted application tool-call proposal | `docs/architecture/adrs/0014-trusted-tool-call-proposal.md` |
| [[agentskit ADR-0015 - Tool authorization before proposal and execution]] | ADR-0015: Tool authorization before proposal and execution | `docs/architecture/adrs/0015-tool-authorization-hook.md` |
| [[agentskit ADR-0019 - Cancellable ChatMemory operations]] | ADR 0019: Cancellable ChatMemory operations | `docs/architecture/adrs/0019-cancellable-chat-memory-operations.md` |
| [[agentskit ADR-0020 - Serializable interaction state]] | ADR 0020 — Serializable interaction state | `docs/architecture/adrs/0020-serializable-interaction-state.md` |
| [[agentskit ADR-0021 - Versioned ecosystem manifest and evidence-backed claims]] | ADR 0021 — Versioned ecosystem manifest and evidence-backed claims | `docs/architecture/adrs/0021-ecosystem-manifest-and-claims.md` |
| [[agentskit ADR-0022 - Consolidate vendor adapters into owning packages]] | ADR 0022: Consolidate vendor adapters into owning packages | `docs/architecture/adrs/0022-public-package-consolidation.md` |
| [[agentskit ADR-0023 - Strict ecosystem documentation quality profile]] | ADR 0023 — Strict ecosystem documentation quality profile | `docs/architecture/adrs/0023-ecosystem-documentation-quality.md` |
| [[agentskit ADR-0024 - Evidence-backed package graduation]] | ADR 0024 — Evidence-backed package graduation | `docs/architecture/adrs/0024-package-graduation-evidence.md` |
| [[agentskit ADR-0025 - Public API snapshots and compatibility matrix]] | ADR 0025 — Public API snapshots and compatibility matrix | `docs/architecture/adrs/0025-public-api-and-compatibility-gates.md` |
| [[agentskit ADR-0026 - Integration execution safety boundaries]] | ADR 0026 — Integration execution safety boundaries | `docs/architecture/adrs/0026-integration-execution-boundaries.md` |
| [[agentskit ADR-0027 - Statechart beta safety boundaries]] | ADR 0027 — Statechart beta safety boundaries | `docs/architecture/adrs/0027-statechart-beta-boundaries.md` |
| [[agentskit ADR-0028 - MCP bridge beta boundaries]] | ADR 0028 — MCP bridge beta boundaries | `docs/architecture/adrs/0028-mcp-beta-boundaries.md` |
| [[agentskit ADR-0029 - Shared ecosystem web shell]] | ADR 0029 — Shared ecosystem web shell | `docs/architecture/adrs/0029-shared-ecosystem-web-shell.md` |
| [[agentskit ADR-0031 - Shared CLI adapter execution boundary]] | ADR 0031 — Shared CLI adapter execution boundary | `docs/architecture/adrs/0031-cli-adapter-execution-boundary.md` |
| [[agentskit ADR-0033 - Registry adopts the ecosystem shell]] | ADR 0033 — Registry adopts the ecosystem shell | `docs/architecture/adrs/0033-registry-ecosystem-shell.md` |
| [[agentskit ADR-0034 - Ecosystem shell v1]] | ADR 0034 — Ecosystem shell v1 | `docs/architecture/adrs/0034-ecosystem-shell-v1.md` |
| [[agentskit ADR-0035 - Documentation pruning and API reference route consolidation]] | ADR 0035 — Documentation pruning and API reference route consolidation | `docs/architecture/adrs/0035-docs-pruning-and-api-route-consolidation.md` |
| [[agentskit ADR-0036 - One package owns OS and runtime portability]] | ADR 0036 — One package owns OS and runtime portability | `docs/architecture/adrs/0036-cross-platform-package.md` |
| [[agentskit ADR-0037 - One package owns HTTP plumbing]] | ADR 0037 — One package owns HTTP plumbing | `docs/architecture/adrs/0037-net-package.md` |
| [[agentskit ADR-0038 - Canonical JSON and SHA-256 helpers]] | ADR 0038 — Canonical JSON and SHA-256 helpers | `docs/architecture/adrs/0038-canonical-json-hash.md` |
| [[agentskit ADR-0039 - Cryptographic IDs for generated identifiers]] | ADR 0039 — Cryptographic IDs for generated identifiers | `docs/architecture/adrs/0039-cryptographic-ids.md` |
| [[agentskit ADR-0040 - Preserve eval replay fingerprint compatibility]] | ADR 0040 — Preserve eval replay fingerprint compatibility | `docs/architecture/adrs/0040-eval-replay-fingerprint-compatibility.md` |
| [[agentskit ADR-0041 - 0041 — Serialize attachments at the provider boundary]] | 0041 — Serialize attachments at the provider boundary | `docs/architecture/adrs/0041-adapter-content-serialization.md` |
| [[agentskit ADR-0042 - Durable tool decisions in core 1.x]] | ADR 0042 — Durable tool decisions in core 1.x | `docs/architecture/adrs/0042-durable-tool-decisions.md` |
| [[agentskit ADR-0043 - Partition-bound RAG composition]] | ADR 0043 — Partition-bound RAG composition | `docs/architecture/adrs/0043-partition-bound-rag.md` |
| [[agentskit ADR-0044 - Durable tenant cost store]] | ADR 0044 — Durable tenant cost store | `docs/architecture/adrs/0044-durable-cost-store.md` |
