---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/react"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/react/package.json", "packages/react/src/index.ts", "apps/docs-next/content/docs/for-agents/react.mdx", "AGENTS.md", "packages/react/CONVENTIONS.md", "packages/react/tests/components", "packages/react/tests/core", "packages/react/tests/package-manifest.test.ts", "packages/react/tests/setup.ts", "docs/architecture/adrs/0005-skill-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0007-docs-platform-fumadocs.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-react

> [!tldr] Em linguagem comum
> Pacote react do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/react` publica a superfície definida em `packages/react/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/react.mdx` e limita edições a `packages/react`. Fonte: `packages/react/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.react`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatController` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:7` |
| `createInMemoryMemory` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:15` |
| `createLocalStorageMemory` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:23` |
| `createStaticRetriever` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:31` |
| `formatRetrievedDocuments` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:39` |
| `MaybePromise` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:42` |
| `StreamStatus` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:44` |
| `MessageRole` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:46` |
| `MessageStatus` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:48` |
| `Message` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:50` |
| `ToolCallStatus` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:52` |
| `ToolCall` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:54` |
| `RetrievedDocument` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:56` |
| `StreamToolCallPayload` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:58` |
| `StreamChunk` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:60` |
| `StreamSource` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:62` |
| `UseStreamOptions` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:64` |
| `UseStreamReturn` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:66` |
| `ToolExecutionContext` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:68` |
| `ToolDefinition` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:70` |
| `ToolCallHandlerContext` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:72` |
| `ChatMemory` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:74` |
| `RetrieverRequest` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:76` |
| `Retriever` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:78` |
| `AdapterContext` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:80` |
| `AdapterRequest` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:82` |
| `ChatConfig` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:84` |
| `ChatState` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:86` |
| `ChatController` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:88` |
| `ChatReturn` | export nomeado | API pública do pacote. | `packages/react/src/index.ts:90` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `describe('@agentskit/react package manifest + import safety', () => {` — `packages/react/tests/package-manifest.test.ts:7`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/react/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/react.mdx` (`.doc-bridge/index.json`, `handoffs.react`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Busca estática por acesso direto ao ambiente encontrou nomes de configuração; veja os módulos listados em `fontes`. Isso não exclui configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/react.mdx`, `packages/react/CONVENTIONS.md` e `packages/react/src/index.ts`.
- **Raiz de edição do handoff:** `packages/react` (`.doc-bridge/index.json`, `handoffs.react`).
- **Invariantes:** 2. The component must be **headless** — no hardcoded styles beyond what's needed for layout. Use `data-ak-*` attributes for styling hooks. (`packages/react/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/react/tests/components`, `packages/react/tests/core`, `packages/react/tests/package-manifest.test.ts`, `packages/react/tests/setup.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/react test` e `pnpm --filter @agentskit/react lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0005 - Skill Contract]], [[agentskit ADR-0006 - Runtime Contract]], [[agentskit ADR-0007 - Documentation platform: Fumadocs]], [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0020 - Serializable interaction state]], [[agentskit ADR-0029 - Shared ecosystem web shell]], [[agentskit ADR-0034 - Ecosystem shell v1]]. Histórico recente (`git log --oneline -15 -- packages/react`):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `8446cc67 docs(react): document public API (#1790)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/react/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/react/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/react.mdx:1` — handoff documental de agentes.
> - `packages/react/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
