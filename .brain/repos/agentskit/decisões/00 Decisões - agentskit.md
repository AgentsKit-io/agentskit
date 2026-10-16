---
tipo: guia
repo: agentskit
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "inventário de docs/architecture/adrs (39 arquivos de ADR e README.md); status e datas conferidos nos cabeçalhos das fontes; CLI Doc Bridge indisponível; auditado em 2026-10-16"
fontes: ["docs/architecture/adrs/README.md"]
tags: [decisoes, repo/agentskit, camada/framework, guia]
---

# 00 Decisões - agentskit

> [!tldr] Em linguagem comum
> Índice das decisões arquiteturais que registram contratos e direções do toolkit. Cada linha aponta para a nota de decisão e para o arquivo-fonte em `docs/architecture/adrs/`.

← [[00 Hub - agentskit]]

## Decisões

| Nota | Tema | Status na fonte | Fonte |
|---|---|---|---|
| [[agentskit ADR-0001 - Contrato de adapter]] | Contrato de adaptador | Accepted | `docs/architecture/adrs/0001-adapter-contract.md` |
| [[agentskit ADR-0002 - Contrato de ferramenta]] | Contrato de ferramenta | Accepted | `docs/architecture/adrs/0002-tool-contract.md` |
| [[agentskit ADR-0003 - Contrato de memória]] | Contrato de memória | Accepted | `docs/architecture/adrs/0003-memory-contract.md` |
| [[agentskit ADR-0004 - Contrato de retriever]] | Contrato de retriever | Accepted | `docs/architecture/adrs/0004-retriever-contract.md` |
| [[agentskit ADR-0005 - Contrato de skill]] | Contrato de skill | Accepted | `docs/architecture/adrs/0005-skill-contract.md` |
| [[agentskit ADR-0006 - Contrato de runtime]] | Contrato de runtime | Accepted | `docs/architecture/adrs/0006-runtime-contract.md` |
| [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]] | Plataforma de documentação: Fumadocs | Accepted | `docs/architecture/adrs/0007-docs-platform-fumadocs.md` |
| [[agentskit ADR-0008 - Validação de argumentos em runtime]] | Validação de argumentos em runtime | Accepted | `docs/architecture/adrs/0008-runtime-validation.md` |
| [[agentskit ADR-0009 - Regras de composição e dependência]] | Regras de composição e dependência | Accepted | `docs/architecture/adrs/0009-composition-rules.md` |
| [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]] | Política de saída de rede (safeFetch) | Accepted | `docs/architecture/adrs/0010-egress-policy.md` |
| [[agentskit ADR-0011 - Validação de requisições de entrada (gatilhos de chat)]] | Validação de requisições de entrada (gatilhos de chat) | Accepted | `docs/architecture/adrs/0011-inbound-validation.md` |
| [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]] | Escopo e granularidade dos adaptadores de fornecedor | Accepted | `docs/architecture/adrs/0012-vendor-adapter-scope.md` |
| [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]] | Validação em runtime de registros de mensagem | Accepted | `docs/architecture/adrs/0013-memory-record-runtime-validation.md` |
| [[agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação]] | Proposta de chamada de ferramenta pela aplicação | Accepted | `docs/architecture/adrs/0014-trusted-tool-call-proposal.md` |
| [[agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução]] | Autorização de ferramenta | Accepted | `docs/architecture/adrs/0015-tool-authorization-hook.md` |
| [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]] | Operações canceláveis de ChatMemory | Accepted | `docs/architecture/adrs/0019-cancellable-chat-memory-operations.md` |
| [[agentskit ADR-0020 - Estado de interação serializável]] | Estado de interação serializável | Accepted | `docs/architecture/adrs/0020-serializable-interaction-state.md` |
| [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]] | Manifesto do ecossistema e afirmações com evidência | Proposed | `docs/architecture/adrs/0021-ecosystem-manifest-and-claims.md` |
| [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]] | Adaptadores de fornecedor consolidados nos pacotes donos | Accepted | `docs/architecture/adrs/0022-public-package-consolidation.md` |
| [[agentskit ADR-0023 - Perfil estrito de qualidade da documentação do ecossistema]] | Perfil estrito de qualidade da documentação | Accepted | `docs/architecture/adrs/0023-ecosystem-documentation-quality.md` |
| [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]] | Graduação de pacotes baseada em evidência | Accepted | `docs/architecture/adrs/0024-package-graduation-evidence.md` |
| [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]] | Snapshots da API pública e compatibilidade | Accepted | `docs/architecture/adrs/0025-public-api-and-compatibility-gates.md` |
| [[agentskit ADR-0026 - Limites de segurança na execução de integrações]] | Limites de segurança na execução de integrações | Accepted | `docs/architecture/adrs/0026-integration-execution-boundaries.md` |
| [[agentskit ADR-0027 - Limites de segurança do statechart beta]] | Limites de segurança do statechart beta | Accepted | `docs/architecture/adrs/0027-statechart-beta-boundaries.md` |
| [[agentskit ADR-0028 - Limites da ponte MCP beta]] | Limites da ponte MCP beta | Accepted | `docs/architecture/adrs/0028-mcp-beta-boundaries.md` |
| [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]] | Shell web compartilhado do ecossistema | Accepted | `docs/architecture/adrs/0029-shared-ecosystem-web-shell.md` |
| [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]] | Fronteira de execução de adaptadores de CLI | Accepted | `docs/architecture/adrs/0031-cli-adapter-execution-boundary.md` |
| [[agentskit ADR-0033 - Registry adota o shell do ecossistema]] | Registry adota o shell do ecossistema | Proposed (aguarda revisão visual) | `docs/architecture/adrs/0033-registry-ecosystem-shell.md` |
| [[agentskit ADR-0034 - Shell do ecossistema v1]] | Shell do ecossistema v1 | Accepted | `docs/architecture/adrs/0034-ecosystem-shell-v1.md` |
| [[agentskit ADR-0035 - Poda da documentação e consolidação das rotas de referência da API]] | Poda da documentação e rotas de referência da API | Accepted | `docs/architecture/adrs/0035-docs-pruning-and-api-route-consolidation.md` |
| [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]] | Um pacote para portabilidade de SO e runtime | Proposed | `docs/architecture/adrs/0036-cross-platform-package.md` |
| [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]] | Um pacote para infraestrutura HTTP | Proposed | `docs/architecture/adrs/0037-net-package.md` |
| [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]] | Utilitários de JSON canônico e SHA-256 | Accepted | `docs/architecture/adrs/0038-canonical-json-hash.md` |
| [[agentskit ADR-0039 - IDs criptográficos para identificadores gerados]] | IDs criptográficos para identificadores gerados | Accepted | `docs/architecture/adrs/0039-cryptographic-ids.md` |
| [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]] | Compatibilidade da impressão digital de replay de avaliação | Proposed | `docs/architecture/adrs/0040-eval-replay-fingerprint-compatibility.md` |
| [[agentskit ADR-0041 - Serializar anexos na fronteira do provedor]] | Serialização de anexos na fronteira do provedor | Proposed (sem data na fonte) | `docs/architecture/adrs/0041-adapter-content-serialization.md` |
| [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]] | Decisões duráveis de ferramenta no core 1.x | Proposed | `docs/architecture/adrs/0042-durable-tool-decisions.md` |
| [[agentskit ADR-0043 - Composição de RAG vinculada a partição]] | Composição de RAG vinculada a partição | Proposed | `docs/architecture/adrs/0043-partition-bound-rag.md` |
| [[agentskit ADR-0044 - Armazenamento durável de custo por tenant]] | Armazenamento durável de custo por tenant | Proposed | `docs/architecture/adrs/0044-durable-cost-store.md` |

## Lacunas de numeração

Os números 0016, 0017, 0018, 0030 e 0032 não têm arquivo em `docs/architecture/adrs/` neste commit (`9f8d8551`). Não há nota para eles, e não se deve inferir conteúdo a partir da lacuna.

## Observações

- Os títulos da fonte estão em inglês; as notas usam os títulos em português do nome do arquivo. O texto integral da decisão nas notas continua em inglês, com a marca "O texto da decisão está em inglês na fonte".
- Os status acima seguem o cabeçalho de cada fonte. Os status em `docs/architecture/adrs/README.md` não foram conferidos linha a linha nesta auditoria.
