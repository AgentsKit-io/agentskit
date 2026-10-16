---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/ink"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/ink/package.json", "packages/ink/src/index.ts", "packages/ink/src/useChat.ts", "packages/ink/src/progress-observer.ts", "packages/ink/README.md", "apps/docs-next/content/docs/for-agents/ink.mdx", "AGENTS.md", "packages/ink/CONVENTIONS.md", "packages/ink/tests/InputBar.test.tsx", "packages/ink/tests/MarkdownText.catch.test.tsx", "packages/ink/tests/MarkdownText.test.tsx", "packages/ink/tests/Message.test.tsx", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0010-egress-policy.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-ink

> [!tldr] Em linguagem comum
> Binding do AgentsKit para interfaces de terminal com Ink (React para CLI): hook `useChat`, componentes de chat para o terminal, um observador de progresso que escreve no terminal e um tema de cores.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

Binding Ink do contrato `ChatReturn` compartilhado. Reexporta o controlador e os tipos de `@agentskit/core` (`packages/ink/src/index.ts:5-80`), mais o hook `useChat` que liga o controlador ao estado do React/Ink (`packages/ink/src/index.ts:91`), um observador de progresso para o terminal (`packages/ink/src/index.ts:97`) e componentes de terminal (`packages/ink/src/index.ts:103-116`). Depende de `@agentskit/core` (`packages/ink/package.json:46`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/ink.mdx` e limita edições a `packages/ink` (`.doc-bridge/index.json`, `handoffs.ink`).

## API e contratos

Exports de `packages/ink/src/index.ts`. Os símbolos reexportados de `@agentskit/core` são os mesmos de `agentskit-react`; aqui listamos a linha de cada export.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatController`, `createInMemoryMemory`, `createLocalStorageMemory`, `createStaticRetriever`, `formatRetrievedDocuments` | funções reexportadas de `@agentskit/core` | Fábrica de controlador, memória (em memória e `localStorage`), retriever estático e formatação de documentos. | `packages/ink/src/index.ts:5`, `:10`, `:15`, `:20`, `:25` |
| `MaybePromise`, `StreamStatus`, `MessageRole`, `MessageStatus`, `ToolCallStatus`, `ToolCall`, `RetrievedDocument`, `MessageType`, `StreamToolCallPayload`, `StreamChunk`, `StreamSource`, `UseStreamOptions`, `UseStreamReturn`, `ToolExecutionContext`, `ToolDefinition`, `ToolCallHandlerContext`, `ChatMemory`, `RetrieverRequest`, `Retriever`, `AdapterContext`, `AdapterRequest`, `ChatConfig`, `ChatState`, `ChatController`, `ChatReturn`, `MemoryRecord`, `AdapterFactory` | tipos reexportados de `@agentskit/core` | Contratos de mensagem, stream, ferramenta, memória, retriever, adapter e controlador. `MessageType` é `Message as MessageType`. | `packages/ink/src/index.ts:28-80` |
| `useChat` | hook | Liga o controlador ao estado do Ink. O JSDoc traz exemplo `useChat({ adapter })` com `<InputBar chat={chat} />`. | `packages/ink/src/index.ts:91`; `packages/ink/src/useChat.ts` |
| `createProgressObserver` | função | Cria um observador que escreve eventos de status no terminal. | `packages/ink/src/index.ts:97`; `packages/ink/src/progress-observer.ts` |
| `SPINNER_FRAMES` | constante | Quadros do spinner Braille usados pelos indicadores de progresso. | `packages/ink/src/index.ts:99` |
| `ProgressObserverOptions` | tipo | Opções de saída e animação do observador. | `packages/ink/src/index.ts:101` |
| `ChatContainer`, `Message`, `InputBar`, `ToolCallView`, `ThinkingIndicator`, `StatusHeader`, `MarkdownText`, `ToolConfirmation`, `TopologyGraphView` | componentes Ink | Componentes de chat para terminal. | `packages/ink/src/index.ts:103-116` |
| `InkThemeProvider`, `useInkTheme`, `defaultInkTheme` | tema | Provedor e hook de tema, com tema padrão. | `packages/ink/src/index.ts:113-115` |
| `ChatContainerProps`, `MessageProps`, `InputBarProps`, `ToolCallViewProps`, `ThinkingIndicatorProps`, `StatusHeaderProps`, `MarkdownTextProps`, `ToolConfirmationProps`, `TopologyGraphViewProps`, `TopologyGraphViewNode`, `TopologyGraphViewEdge`, `TopologyGraphViewSnapshot`, `TopologyGraphSource`, `InkTheme` | tipos | Props dos componentes e formatos do grafo de topologia e do tema. | `packages/ink/src/index.ts:118-133` |

Exemplo real do README (imports do pacote):

```tsx
import { ChatContainer, InputBar, Message, useChat } from '@agentskit/ink'
import { ollama } from '@agentskit/adapters'
```

Fonte: `packages/ink/README.md:56-57`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/ink/package.json:46`, `"@agentskit/core": "workspace:*"`) |
| Consumidores no monorepo | `apps/example-ink` (`apps/example-ink/package.json:13`) e `packages/cli` (`packages/cli/package.json:55`) declaram `"@agentskit/ink": "workspace:*"`. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/ink.mdx` (`.doc-bridge/index.json`, `handoffs.ink`) |

## Dados e efeitos

- Nenhuma leitura de variáveis de ambiente em `packages/ink/src` (busca por `process.env` sem resultado).
- Escreve no terminal (stdout) pelo observador de progresso e pelos componentes Ink. O teclado é lido só pelo hook `useInput` do Ink, nunca por stdin direto (`packages/ink/CONVENTIONS.md:26`).
- O README configura o adapter com `ollama` de `@agentskit/adapters`; o manifesto deste pacote não declara `@agentskit/adapters`, então a configuração do adapter é responsabilidade do consumidor.
- Sem permissões ou capabilities exigidas além de um terminal compatível com Ink.

## Como mexer (para agentes)

- **Comece por:** `packages/ink/CONVENTIONS.md`, `packages/ink/src/index.ts` e `packages/ink/src/useChat.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/ink.mdx`.
- **Raiz de edição do handoff:** `packages/ink` (`.doc-bridge/index.json`, `handoffs.ink`).
- **Invariantes:**
  - Usar o hook `useInput` do Ink e não ler stdin diretamente (`packages/ink/CONVENTIONS.md:26`).
  - `ink-testing-library@4` não passa stdin pelo pipeline de entrada do `ink@7`; testes de teclado precisam mockar `useInput` diretamente (`packages/ink/CONVENTIONS.md:32`).
- **Testes:** `packages/ink/tests/useChat-sync.test.ts` (hook), `packages/ink/tests/exports.test.ts` (superfície pública), `packages/ink/tests/progress-observer.test.ts`, `packages/ink/tests/integration.test.tsx`, `packages/ink/tests/security-boundary.test.tsx`, `packages/ink/tests/theme.test.tsx`, componentes (`InputBar`, `Message`, `MarkdownText`, `MarkdownText.catch`, `StatusHeader`, `ToolCallView`, `ToolConfirmation`, `TopologyGraphView`) e snapshots em `packages/ink/tests/visual.snap.test.tsx`.
- **Validação:** `pnpm --filter @agentskit/ink test` (executa `turbo run build` e `vitest run`, `packages/ink/package.json:40`) e `pnpm --filter @agentskit/ink lint` (`tsc --noEmit`, `packages/ink/package.json:42`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados pelos documentos citados na fonte da nota: [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0010 - Política de saída de rede (safeFetch)]], [[agentskit ADR-0020 - Estado de interação serializável]]. Histórico recente (`git log --oneline -8 -- packages/ink`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `8446cc67 docs(react): document public API (#1790)`
- `3f0c7039 docs(ink): document public API (#1786)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`

> [!info]- Detalhe técnico
> - `packages/ink/package.json:1` — manifesto, dependências (`:46`) e scripts (`:40`, `:42`).
> - `packages/ink/src/index.ts:1` — entrada pública (controlador, hook, observador, componentes e tema).
> - `packages/ink/README.md:56` — exemplo de import.
> - `packages/ink/CONVENTIONS.md:26` — uso de `useInput` e testes de teclado.
> - `apps/docs-next/content/docs/for-agents/ink.mdx:1` — handoff documental de agentes.
