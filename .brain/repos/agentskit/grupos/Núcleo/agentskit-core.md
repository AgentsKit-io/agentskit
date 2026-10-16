---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/core"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/core/package.json", "packages/core/src/index.ts", "apps/docs-next/content/docs/for-agents/core.mdx", "AGENTS.md", "packages/core/CONVENTIONS.md", "packages/core/tests/a2a.test.ts", "packages/core/tests/agent-loop.test.ts", "packages/core/tests/agent-schema.test.ts", "packages/core/tests/agent-substrate.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0003-memory-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-core

> [!tldr] Em linguagem comum
> Pacote core do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/core` publica a superfície definida em `packages/core/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/core.mdx` e limita edições a `packages/core`. Fonte: `packages/core/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.core`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatController` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:1` |
| `createInMemoryMemory` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:13` |
| `createLocalStorageMemory` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:13` |
| `serializeMessages` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:13` |
| `deserializeMessages` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:13` |
| `createStaticRetriever` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:14` |
| `formatRetrievedDocuments` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:14` |
| `defineTool` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:27` |
| `compileBudget` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:28` |
| `approximateCounter` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:28` |
| `{` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:29` |
| `createProgressiveArgParser` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:34` |
| `executeToolProgressively` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:34` |
| `createVirtualizedMemory` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:35` |
| `VirtualizedMemoryOptions` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:36` |
| `{` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:47` |
| `{` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:56` |
| `ConsumeStreamHandlers` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:62` |
| `buildToolMap` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:63` |
| `activateSkills` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:63` |
| `executeSafeTool` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:63` |
| `ActivateSkillsResult` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:64` |
| `ToolExecResult` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:64` |
| `ExecuteSafeToolOptions` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:64` |
| `{` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:65` |
| `TokenUsage` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:128` |
| `ParsedToolArgs` | export nomeado | API pública do pacote. | `packages/core/src/index.ts:129` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { createChatController, createInMemoryMemory } from '@agentskit/core'` — `packages/core/README.md:52`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | Nenhuma dependência interna declarada no manifesto. (`packages/core/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/core.mdx` (`.doc-bridge/index.json`, `handoffs.core`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Busca estática por acesso direto ao ambiente encontrou nomes de configuração; veja os módulos listados em `fontes`. Isso não exclui configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/core.mdx`, `packages/core/CONVENTIONS.md` e `packages/core/src/index.ts`.
- **Raiz de edição do handoff:** `packages/core` (`.doc-bridge/index.json`, `handoffs.core`).
- **Invariantes:** **Under 10KB gzipped.** CI (`size-limit`) enforces it on the real import cost: `dist/index.js` bundled with every chunk it statically imports (`scripts/size-core-closure.mjs`), plus `dist/index.cjs`. Subpath-only code must not be statically imported by `src/index.ts`'s graph; load it lazily (`await import('./x.js')` + tsup `external`). If you're pushing the limit, the change is too big. (`packages/core/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/core/tests/a2a.test.ts`, `packages/core/tests/agent-loop.test.ts`, `packages/core/tests/agent-schema.test.ts`, `packages/core/tests/agent-substrate.test.ts`, `packages/core/tests/auto-summarize.test.ts`, `packages/core/tests/budget.test.ts`, `packages/core/tests/compose-tool.test.ts`, `packages/core/tests/content.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/core test` e `pnpm --filter @agentskit/core lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]], [[agentskit ADR-0008 - Validação de argumentos em runtime]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]], [[agentskit ADR-0011 - Validação de requisições de entrada (gatilhos de chat)]], [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]], [[agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação]], [[agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução]], [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]], [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]], [[agentskit ADR-0023 - Perfil estrito de qualidade da documentação do ecossistema]], [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]], [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]], [[agentskit ADR-0026 - Limites de segurança na execução de integrações]], [[agentskit ADR-0027 - Limites de segurança do statechart beta]], [[agentskit ADR-0028 - Limites da ponte MCP beta]], [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0034 - Shell do ecossistema v1]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]], [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]], [[agentskit ADR-0039 - IDs criptográficos para identificadores gerados]], [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]], [[agentskit ADR-0041 - Serializar anexos na fronteira do provedor]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]], [[agentskit ADR-0043 - Composição de RAG vinculada a partição]], [[agentskit ADR-0044 - Armazenamento durável de custo por tenant]]. Histórico recente (`git log --oneline -15 -- packages/core`):

- `e8d42064 chore: version packages (#1757)`
- `677f7e22 fix(core): ordered, idempotent durable tool decisions (follow-ups to #1828) (#1833)`
- `8bf15b0a feat(core): durable tool decisions and multimodal sends (#1828)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `d10ad3ef chore(guardrails): forbid weak Math.random identifiers (#1769)`
- `a4a37be0 fix(core): bound streamed JWKS reads (#1761)`

## No law-os

É o **alicerce do AgentsKit**: os tipos e utilitários básicos que todos os outros pacotes do OSS usam. No backend do law-os, ajuda a **montar as mensagens** enviadas à IA e a ler as chamadas de ferramenta. No front, está só instalado.

| Onde | Papel |
|---|---|
| Backend, [[law-os - Etapa 2 - Triagem]] a [[law-os - Etapa 6 - Redigir parecer]] | Formata as mensagens e as chamadas de ferramenta dentro do despacho de IA (`buildMessage`, `safeParseArgs`), via [[os-runtime-agentskit]] |
| Front | **Instalado, sem uso**: declarado em `package.json`, sem nenhum `import` em `src` |

| Ramo atual | Papel |
|---|---|
| [[law-os - Etapa 6c - Revisar parecer devolvido]] | Nova execução com parecer-reviser; usa o mesmo caminho de execução/IA e retorna à validação antes da aprovação. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.

> [!info]- Detalhe técnico
> - `packages/core/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/core/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/core.mdx:1` — handoff documental de agentes.
> - `packages/core/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
