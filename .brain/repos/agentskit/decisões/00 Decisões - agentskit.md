---
tipo: guia
repo: agentskit
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "inventário de docs/architecture/adrs; CLI Doc Bridge indisponível"
fontes: ["docs/architecture/adrs/README.md"]
tags: [decisoes, repo/agentskit, camada/framework, guia]
---

# 00 Decisões - agentskit

> [!tldr] Em linguagem comum
> Índice das decisões arquiteturais que registram contratos e direções do toolkit.

← [[00 Hub - agentskit]]

## Decisões

| Nota | Tema | Fonte |
|---|---|---|
| [[agentskit ADR-0001 - Contrato de adapter]] | ADR 0001 — Adapter Contract | `docs/architecture/adrs/0001-adapter-contract.md` |
| [[agentskit ADR-0002 - Contrato de ferramenta]] | ADR 0002 — Tool Contract | `docs/architecture/adrs/0002-tool-contract.md` |
| [[agentskit ADR-0003 - Contrato de memória]] | ADR 0003 — Memory Contract | `docs/architecture/adrs/0003-memory-contract.md` |
| [[agentskit ADR-0004 - Contrato de retriever]] | ADR 0004 — Retriever Contract | `docs/architecture/adrs/0004-retriever-contract.md` |
| [[agentskit ADR-0005 - Contrato de skill]] | ADR 0005 — Skill Contract | `docs/architecture/adrs/0005-skill-contract.md` |
| [[agentskit ADR-0006 - Contrato de runtime]] | ADR 0006 — Runtime Contract | `docs/architecture/adrs/0006-runtime-contract.md` |
| [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]] | ADR 0007 — Documentation platform: Fumadocs | `docs/architecture/adrs/0007-docs-platform-fumadocs.md` |
| [[agentskit ADR-0008 - Validação de argumentos em runtime]] | ADR 0008 — Runtime argument validation | `docs/architecture/adrs/0008-runtime-validation.md` |
| [[agentskit ADR-0009 - Regras de composição e dependência]] | ADR 0009 — Composition & dependency rules | `docs/architecture/adrs/0009-composition-rules.md` |
| [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]] | ADR 0010 — Network egress policy (safeFetch) | `docs/architecture/adrs/0010-egress-policy.md` |
| [[agentskit ADR-0011 - Validação de requisições de entrada (gatilhos de chat)]] | ADR 0011 — Inbound request validation (chat triggers) | `docs/architecture/adrs/0011-inbound-validation.md` |
| [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]] | ADR 0012 — Vendor adapter scope & granularity | `docs/architecture/adrs/0012-vendor-adapter-scope.md` |
| [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]] | ADR 0013 — Runtime validation for serialized message records | `docs/architecture/adrs/0013-memory-record-runtime-validation.md` |
| [[agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação]] | ADR-0014: Trusted application tool-call proposal | `docs/architecture/adrs/0014-trusted-tool-call-proposal.md` |
| [[agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução]] | ADR-0015: Tool authorization before proposal and execution | `docs/architecture/adrs/0015-tool-authorization-hook.md` |
| [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]] | ADR 0019: Cancellable ChatMemory operations | `docs/architecture/adrs/0019-cancellable-chat-memory-operations.md` |
| [[agentskit ADR-0020 - Estado de interação serializável]] | ADR 0020 — Serializable interaction state | `docs/architecture/adrs/0020-serializable-interaction-state.md` |
| [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]] | ADR 0021 — Versioned ecosystem manifest and evidence-backed claims | `docs/architecture/adrs/0021-ecosystem-manifest-and-claims.md` |
| [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]] | ADR 0022: Consolidate vendor adapters into owning packages | `docs/architecture/adrs/0022-public-package-consolidation.md` |
| [[agentskit ADR-0023 - Perfil estrito de qualidade da documentação do ecossistema]] | ADR 0023 — Strict ecosystem documentation quality profile | `docs/architecture/adrs/0023-ecosystem-documentation-quality.md` |
| [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]] | ADR 0024 — Evidence-backed package graduation | `docs/architecture/adrs/0024-package-graduation-evidence.md` |
| [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]] | ADR 0025 — Public API snapshots and compatibility matrix | `docs/architecture/adrs/0025-public-api-and-compatibility-gates.md` |
| [[agentskit ADR-0026 - Limites de segurança na execução de integrações]] | ADR 0026 — Integration execution safety boundaries | `docs/architecture/adrs/0026-integration-execution-boundaries.md` |
| [[agentskit ADR-0027 - Limites de segurança do statechart beta]] | ADR 0027 — Statechart beta safety boundaries | `docs/architecture/adrs/0027-statechart-beta-boundaries.md` |
| [[agentskit ADR-0028 - Limites da ponte MCP beta]] | ADR 0028 — MCP bridge beta boundaries | `docs/architecture/adrs/0028-mcp-beta-boundaries.md` |
| [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]] | ADR 0029 — Shared ecosystem web shell | `docs/architecture/adrs/0029-shared-ecosystem-web-shell.md` |
| [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]] | ADR 0031 — Shared CLI adapter execution boundary | `docs/architecture/adrs/0031-cli-adapter-execution-boundary.md` |
| [[agentskit ADR-0033 - Registry adota o shell do ecossistema]] | ADR 0033 — Registry adopts the ecosystem shell | `docs/architecture/adrs/0033-registry-ecosystem-shell.md` |
| [[agentskit ADR-0034 - Shell do ecossistema v1]] | ADR 0034 — Ecosystem shell v1 | `docs/architecture/adrs/0034-ecosystem-shell-v1.md` |
| [[agentskit ADR-0035 - Poda da documentação e consolidação das rotas de referência da API]] | ADR 0035 — Documentation pruning and API reference route consolidation | `docs/architecture/adrs/0035-docs-pruning-and-api-route-consolidation.md` |
| [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]] | ADR 0036 — One package owns OS and runtime portability | `docs/architecture/adrs/0036-cross-platform-package.md` |
| [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]] | ADR 0037 — One package owns HTTP plumbing | `docs/architecture/adrs/0037-net-package.md` |
| [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]] | ADR 0038 — Canonical JSON and SHA-256 helpers | `docs/architecture/adrs/0038-canonical-json-hash.md` |
| [[agentskit ADR-0039 - IDs criptográficos para identificadores gerados]] | ADR 0039 — Cryptographic IDs for generated identifiers | `docs/architecture/adrs/0039-cryptographic-ids.md` |
| [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]] | ADR 0040 — Preserve eval replay fingerprint compatibility | `docs/architecture/adrs/0040-eval-replay-fingerprint-compatibility.md` |
| [[agentskit ADR-0041 - Serializar anexos na fronteira do provedor]] | 0041 — Serialize attachments at the provider boundary | `docs/architecture/adrs/0041-adapter-content-serialization.md` |
| [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]] | ADR 0042 — Durable tool decisions in core 1.x | `docs/architecture/adrs/0042-durable-tool-decisions.md` |
| [[agentskit ADR-0043 - Composição de RAG vinculada a partição]] | ADR 0043 — Partition-bound RAG composition | `docs/architecture/adrs/0043-partition-bound-rag.md` |
| [[agentskit ADR-0044 - Armazenamento durável de custo por tenant]] | ADR 0044 — Durable tenant cost store | `docs/architecture/adrs/0044-durable-cost-store.md` |
