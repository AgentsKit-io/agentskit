---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/react"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/react/package.json", "packages/react/src/index.ts", "packages/react/CONVENTIONS.md", "packages/react/fixtures/readme-quickstart.tsx", "apps/docs-next/content/docs/for-agents/react.mdx", "AGENTS.md", "packages/react/tests/components", "packages/react/tests/core", "packages/react/tests/package-manifest.test.ts", "packages/react/tests/setup.ts", "docs/architecture/adrs/0005-skill-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0007-docs-platform-fumadocs.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-react

> [!tldr] Em linguagem comum
> Hooks de chat (`useChat`, `useStream`, `useReactive`) e componentes de interface sem estilo fixo para aplicações React. Reexporta os tipos e a fábrica de controlador de `@agentskit/core`.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/react` publica a superfície definida em `packages/react/src/index.ts`. Escopo declarado: hooks (`useChat`, `useStream`, `useReactive`), componentes headless (`ChatContainer`, `Message`, `InputBar`, `ThinkingIndicator`, `ToolCallView`, `CodeBlock`) e o tema CSS em `@agentskit/react/theme` (`packages/react/CONVENTIONS.md:7-9`; `packages/react/package.json:39`).

Limites declarados: wrappers de outros frameworks têm pacote próprio, adapters de provedor ficam em `@agentskit/adapters` e o runtime autônomo em `@agentskit/runtime`; nada que roda só em Node entra aqui (`packages/react/CONVENTIONS.md:11-16`). O pacote é declarado como `beta` (`packages/react/package.json:76-79`). O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/react.mdx` e limita edições a `packages/react` (`.doc-bridge/index.json`, `handoffs.react`).

## API e contratos

Exports de topo, na ordem de `packages/react/src/index.ts`. Os tipos são reexportados de `@agentskit/core`; a descrição vem do JSDoc do próprio arquivo.

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatController` | função reexportada | Cria o controlador imperativo de chat usado pelos bindings de framework. | `packages/react/src/index.ts:7` |
| `createInMemoryMemory` | função reexportada | Cria um `ChatMemory` que guarda mensagens só em memória. | `packages/react/src/index.ts:15` |
| `createLocalStorageMemory` | função reexportada | Cria um `ChatMemory` com persistência em `localStorage`, quando disponível. | `packages/react/src/index.ts:23` |
| `createStaticRetriever` | função reexportada | Cria um retriever que ranqueia um conjunto fixo de documentos. | `packages/react/src/index.ts:31` |
| `formatRetrievedDocuments` | função reexportada | Formata documentos recuperados como blocos de texto numerados. | `packages/react/src/index.ts:39` |
| `MaybePromise` | tipo | Valor síncrono ou promise aceito pelos pontos de extensão. | `packages/react/src/index.ts:42` |
| `StreamStatus` | tipo | Estado de uma resposta em streaming. | `packages/react/src/index.ts:44` |
| `MessageRole` | tipo | Papel atribuído a uma mensagem. | `packages/react/src/index.ts:46` |
| `MessageStatus` | tipo | Ciclo de vida de uma mensagem. | `packages/react/src/index.ts:48` |
| `MessageType` | tipo | Alias de `Message` do core (`Message as MessageType`). | `packages/react/src/index.ts:50` |
| `ToolCallStatus` | tipo | Estado de uma chamada de ferramenta (execução ou confirmação). | `packages/react/src/index.ts:52` |
| `ToolCall` | tipo | Chamada de ferramenta com argumentos, resultado, erro e status. | `packages/react/src/index.ts:54` |
| `RetrievedDocument` | tipo | Documento devolvido por um retriever, com metadados e score opcionais. | `packages/react/src/index.ts:56` |
| `StreamToolCallPayload` | tipo | Campos de chamada de ferramenta emitidos por um adapter. | `packages/react/src/index.ts:58` |
| `StreamChunk` | tipo | Evento de texto, ferramenta, uso, raciocínio, erro ou conclusão no stream. | `packages/react/src/index.ts:60` |
| `StreamSource` | tipo | Fonte de stream assíncrona com operação de abort. | `packages/react/src/index.ts:62` |
| `UseStreamOptions` | tipo | Callbacks para observar chunks, conclusão e erros. | `packages/react/src/index.ts:64` |
| `UseStreamReturn` | tipo | Dados acumulados e controles devolvidos por `useStream`. | `packages/react/src/index.ts:66` |
| `ToolExecutionContext` | tipo | Contexto de mensagem e chamada passado à função de execução da ferramenta. | `packages/react/src/index.ts:68` |
| `ToolDefinition` | tipo | Contrato de schema, ciclo de vida e execução de uma ferramenta. | `packages/react/src/index.ts:70` |
| `ToolCallHandlerContext` | tipo | Contexto passado a um handler de chamada de ferramenta. | `packages/react/src/index.ts:72` |
| `ChatMemory` | tipo | Interface de carregar, salvar e (opcionalmente) limpar mensagens. | `packages/react/src/index.ts:74` |
| `RetrieverRequest` | tipo | Consulta e histórico enviados a um retriever. | `packages/react/src/index.ts:76` |
| `Retriever` | tipo | Interface para recuperar documentos, síncrona ou assíncrona. | `packages/react/src/index.ts:78` |
| `AdapterContext` | tipo | Configurações de modelo e ferramentas de uma requisição ao adapter. | `packages/react/src/index.ts:80` |
| `AdapterRequest` | tipo | Mensagens e contexto que o controlador envia ao adapter. | `packages/react/src/index.ts:82` |
| `ChatConfig` | tipo | Configuração do controlador de chat e das integrações. | `packages/react/src/index.ts:84` |
| `ChatState` | tipo | Mensagens, status do stream, entrada, erro e uso de tokens. | `packages/react/src/index.ts:86` |
| `ChatController` | tipo | Interface imperativa de estado, assinatura e ações do chat. | `packages/react/src/index.ts:88` |
| `ChatReturn` | tipo | Estado e ações expostos ao consumidor do framework. | `packages/react/src/index.ts:90` |
| `MemoryRecord` | tipo | Mensagens serializadas com versão e timestamps em string. | `packages/react/src/index.ts:92` |
| `AdapterFactory` | tipo | Função que cria uma fonte de stream a partir de uma requisição. | `packages/react/src/index.ts:94` |
| `useStream` | hook | Consome um `StreamSource` e acumula chunks (opções em `UseStreamOptions`, retorno em `UseStreamReturn`). | `packages/react/src/index.ts:96` |
| `useReactive` | hook | Hook de primitivas reativas, citado em `packages/react/CONVENTIONS.md:7`; sem descrição no JSDoc. | `packages/react/src/index.ts:97` |
| `useChat` | hook | Hook de chat sobre o controlador (estado em `ChatState`, retorno em `ChatReturn`). | `packages/react/src/index.ts:98` |
| `ChatContainer`, `Message`, `InputBar`, `Markdown`, `CodeBlock`, `ToolCallView`, `ThinkingIndicator`, `ToolConfirmation`, `TopologyGraphView` | componentes | Componentes headless de interface, reexportados de `./components`. | `packages/react/src/index.ts:100-110` |
| `ChatContainerProps`, `MessageProps`, `InputBarProps`, `MarkdownProps`, `CodeBlockProps`, `ToolCallViewProps`, `ThinkingIndicatorProps`, `ToolConfirmationProps`, `TopologyGraphViewProps`, `TopologyGraphViewNode`, `TopologyGraphViewEdge`, `TopologyGraphViewSnapshot`, `TopologyGraphSource` | tipos | Props e formatos de dados dos componentes. | `packages/react/src/index.ts:112-126` |

Exemplo real de uso, do README quickstart (fixture usada para validar o trecho):

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

export function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-6' }),
  })
  // ...
```

Fonte: `packages/react/fixtures/readme-quickstart.tsx:1-8`. O mesmo import aparece em `apps/example-react/src/App.tsx:4`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/react/package.json:52`, `"@agentskit/core": "workspace:*"`) |
| Peer dependencies | `react` e `react-dom` `>=18.0.0` (`packages/react/package.json:54-57`) |
| Consumidores no monorepo | Declaram `"@agentskit/react": "workspace:*"` em `package.json`: `apps/example-react` (`:14`), `apps/example-rag-chat` (`:15`), `apps/example-multi-agent` (`:12`), `apps/example-webllm` (`:15`), `apps/visual-react` (`:17`), `apps/registry` (`:21`) e `apps/docs-next` (`:44`). |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/react.mdx` (`.doc-bridge/index.json`, `handoffs.react`) |
| Uso externo | Não confirmado: a análise cobre o monorepo, não as instalações de terceiros. |

## Dados e efeitos

- Nenhum acesso a variáveis de ambiente em `packages/react/src` (busca textual por `process.env` sem resultado). O nome `ANTHROPIC_API_KEY` aparece só no fixture de exemplo, e o valor nunca é lido pelo pacote.
- Persistência local: somente `createLocalStorageMemory`, reexportado de `@agentskit/core` (`packages/react/src/index.ts:23`), que usa `localStorage` quando disponível (JSDoc em `packages/react/src/index.ts:21`).
- O pacote não faz chamadas de rede por conta própria; a chamada ao modelo passa pelo adapter que o consumidor injeta em `useChat`.
- Permissões e capabilities: nenhuma exigida além do ambiente do navegador ou de React 18+.

## Como mexer (para agentes)

- **Comece por:** `packages/react/CONVENTIONS.md`, `packages/react/src/index.ts` e `apps/docs-next/content/docs/for-agents/react.mdx`.
- **Raiz de edição do handoff:** `packages/react` (`.doc-bridge/index.json`, `handoffs.react`).
- **Invariantes:** o componente deve ser **headless**, sem estilos fixos além do necessário para layout; use `data-ak-*` como gancho de estilo (`packages/react/CONVENTIONS.md:21`). Não importar CSS dentro de arquivo de componente (`packages/react/CONVENTIONS.md:42`). Hooks não usam estado global (`packages/react/CONVENTIONS.md:32`).
- **Testes:** `packages/react/tests/components` (um arquivo por componente), `packages/react/tests/core` (`useChat`, `useStream`, `useReactive`), `packages/react/tests/package-manifest.test.ts` (entradas do pacote e ausência de imports Node em `src`) e `packages/react/tests/setup.ts`.
- **Validação:** `pnpm --filter @agentskit/react test` (roda `turbo run build` e `vitest run`, `packages/react/package.json:46`) e `pnpm --filter @agentskit/react lint` (`tsc --noEmit`, `packages/react/package.json:48`). Não executados: `pnpm` não está instalado no ambiente desta auditoria.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0029 - Shell web compartilhado do ecossistema]], [[agentskit ADR-0034 - Shell do ecossistema v1]]. Histórico recente (`git log --oneline -8 -- packages/react`, conferido em 2026-10-16):

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
> - `packages/react/src/index.ts:1` — entrada pública (reexports de `@agentskit/core`, hooks e componentes).
> - `packages/react/tests/package-manifest.test.ts:43` — importa `../src/index` e confere os nomes públicos.
> - `apps/docs-next/content/docs/for-agents/react.mdx:1` — handoff documental de agentes.
> - `packages/react/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
