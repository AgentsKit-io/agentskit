---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/ink"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/ink/package.json", "packages/ink/src/index.ts", "apps/docs-next/content/docs/for-agents/ink.mdx", "AGENTS.md", "packages/ink/CONVENTIONS.md", "packages/ink/tests/InputBar.test.tsx", "packages/ink/tests/MarkdownText.catch.test.tsx", "packages/ink/tests/MarkdownText.test.tsx", "packages/ink/tests/Message.test.tsx", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0010-egress-policy.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-ink

> [!tldr] Em linguagem comum
> Pacote ink do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/ink` publica a superfície definida em `packages/ink/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/ink.mdx` e limita edições a `packages/ink`. Fonte: `packages/ink/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.ink`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatController` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:5` |
| `createInMemoryMemory` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:10` |
| `createLocalStorageMemory` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:15` |
| `createStaticRetriever` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:20` |
| `formatRetrievedDocuments` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:25` |
| `MaybePromise` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:28` |
| `StreamStatus` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:30` |
| `MessageRole` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:32` |
| `MessageStatus` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:34` |
| `ToolCallStatus` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:36` |
| `ToolCall` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:38` |
| `RetrievedDocument` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:40` |
| `Message` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:42` |
| `StreamToolCallPayload` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:44` |
| `StreamChunk` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:46` |
| `StreamSource` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:48` |
| `UseStreamOptions` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:50` |
| `UseStreamReturn` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:52` |
| `ToolExecutionContext` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:54` |
| `ToolDefinition` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:56` |
| `ToolCallHandlerContext` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:58` |
| `ChatMemory` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:60` |
| `RetrieverRequest` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:62` |
| `Retriever` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:64` |
| `AdapterContext` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:66` |
| `AdapterRequest` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:68` |
| `ChatConfig` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:70` |
| `ChatState` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:72` |
| `ChatController` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:74` |
| `ChatReturn` | export nomeado | API pública do pacote. | `packages/ink/src/index.ts:76` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { ChatContainer, InputBar, Message, useChat } from '@agentskit/ink'` — `packages/ink/README.md:56`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/ink/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/ink.mdx` (`.doc-bridge/index.json`, `handoffs.ink`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/ink.mdx`, `packages/ink/CONVENTIONS.md` e `packages/ink/src/index.ts`.
- **Raiz de edição do handoff:** `packages/ink` (`.doc-bridge/index.json`, `handoffs.ink`).
- **Invariantes:** `ink-testing-library@4` does **not** route stdin through `ink@7`'s input pipeline. Keyboard-input tests must mock `useInput` directly: (`packages/ink/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/ink/tests/InputBar.test.tsx`, `packages/ink/tests/MarkdownText.catch.test.tsx`, `packages/ink/tests/MarkdownText.test.tsx`, `packages/ink/tests/Message.test.tsx`, `packages/ink/tests/StatusHeader.test.tsx`, `packages/ink/tests/ToolCallView.test.tsx`, `packages/ink/tests/ToolConfirmation.test.tsx`, `packages/ink/tests/TopologyGraphView.test.tsx`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/ink test` e `pnpm --filter @agentskit/ink lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0010 - Network egress policy (safeFetch)]], [[agentskit ADR-0020 - Serializable interaction state]], [[agentskit ADR-0021 - Versioned ecosystem manifest and evidence-backed claims]], [[agentskit ADR-0023 - Strict ecosystem documentation quality profile]], [[agentskit ADR-0029 - Shared ecosystem web shell]], [[agentskit ADR-0033 - Registry adopts the ecosystem shell]], [[agentskit ADR-0034 - Ecosystem shell v1]], [[agentskit ADR-0035 - Documentation pruning and API reference route consolidation]]. Histórico recente (`git log --oneline -15 -- packages/ink`):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `8446cc67 docs(react): document public API (#1790)`
- `3f0c7039 docs(ink): document public API (#1786)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`

> [!info]- Detalhe técnico
> - `packages/ink/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/ink/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/ink.mdx:1` — handoff documental de agentes.
> - `packages/ink/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
