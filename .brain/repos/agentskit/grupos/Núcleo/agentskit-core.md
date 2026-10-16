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

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Adapter Contract]], [[agentskit ADR-0002 - Tool Contract]], [[agentskit ADR-0003 - Memory Contract]], [[agentskit ADR-0004 - Retriever Contract]], [[agentskit ADR-0005 - Skill Contract]], [[agentskit ADR-0006 - Runtime Contract]], [[agentskit ADR-0007 - Documentation platform: Fumadocs]], [[agentskit ADR-0008 - Runtime argument validation]], [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0010 - Network egress policy (safeFetch)]], [[agentskit ADR-0011 - Inbound request validation (chat triggers)]], [[agentskit ADR-0012 - Vendor adapter scope & granularity]], [[agentskit ADR-0013 - Runtime validation for serialized message records]], [[agentskit ADR-0014 - Trusted application tool-call proposal]], [[agentskit ADR-0015 - Tool authorization before proposal and execution]], [[agentskit ADR-0019 - Cancellable ChatMemory operations]], [[agentskit ADR-0020 - Serializable interaction state]], [[agentskit ADR-0021 - Versioned ecosystem manifest and evidence-backed claims]], [[agentskit ADR-0022 - Consolidate vendor adapters into owning packages]], [[agentskit ADR-0023 - Strict ecosystem documentation quality profile]], [[agentskit ADR-0024 - Evidence-backed package graduation]], [[agentskit ADR-0025 - Public API snapshots and compatibility matrix]], [[agentskit ADR-0026 - Integration execution safety boundaries]], [[agentskit ADR-0027 - Statechart beta safety boundaries]], [[agentskit ADR-0028 - MCP bridge beta boundaries]], [[agentskit ADR-0029 - Shared ecosystem web shell]], [[agentskit ADR-0031 - Shared CLI adapter execution boundary]], [[agentskit ADR-0034 - Ecosystem shell v1]], [[agentskit ADR-0036 - One package owns OS and runtime portability]], [[agentskit ADR-0037 - One package owns HTTP plumbing]], [[agentskit ADR-0038 - Canonical JSON and SHA-256 helpers]], [[agentskit ADR-0039 - Cryptographic IDs for generated identifiers]], [[agentskit ADR-0040 - Preserve eval replay fingerprint compatibility]], [[agentskit ADR-0041 - 0041 — Serialize attachments at the provider boundary]], [[agentskit ADR-0042 - Durable tool decisions in core 1.x]], [[agentskit ADR-0043 - Partition-bound RAG composition]], [[agentskit ADR-0044 - Durable tenant cost store]]. Histórico recente (`git log --oneline -15 -- packages/core`):

- `e8d42064 chore: version packages (#1757)`
- `677f7e22 fix(core): ordered, idempotent durable tool decisions (follow-ups to #1828) (#1833)`
- `8bf15b0a feat(core): durable tool decisions and multimodal sends (#1828)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `d10ad3ef chore(guardrails): forbid weak Math.random identifiers (#1769)`
- `a4a37be0 fix(core): bound streamed JWKS reads (#1761)`

> [!info]- Detalhe técnico
> - `packages/core/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/core/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/core.mdx:1` — handoff documental de agentes.
> - `packages/core/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
