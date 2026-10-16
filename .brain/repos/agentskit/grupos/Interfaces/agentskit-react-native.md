---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/react-native"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/react-native/package.json", "packages/react-native/src/index.ts", "packages/react-native/src/useChat.ts", "packages/react-native/README.md", "packages/react-native/fixtures/readme-quickstart.tsx", "apps/docs-next/content/docs/for-agents/react-native.mdx", "AGENTS.md", "packages/react-native/CONVENTIONS.md", "packages/react-native/tests/components.test.tsx", "packages/react-native/tests/package-manifest.test.ts", "packages/react-native/tests/react-native.mock.tsx", "packages/react-native/tests/useChat.test.ts", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-react-native

> [!tldr] Em linguagem comum
> Versão do binding React para React Native e Expo: o mesmo hook `useChat` e componentes montados com primitivas do React Native (em vez de elementos HTML), com `testID` no lugar de `data-ak-*`.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

Binding React Native / Expo do contrato `ChatReturn` compartilhado. Tem a mesma forma de hook do `@agentskit/react`, mas renderiza com primitivas do RN (`View`, `Text`, `TextInput`, …) e usa `testID` (`packages/react-native/CONVENTIONS.md:3-5`, `:12`). O hook `useChat(config)` é um hook React puro sobre `createChatController`, sem DOM (`packages/react-native/CONVENTIONS.md:11`). Peers: `react ^18 || ^19` e `react-native *` (`packages/react-native/CONVENTIONS.md:7`). O pacote depende de `@agentskit/core` (`packages/react-native/package.json:50`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/react-native.mdx` e limita edições a `packages/react-native` (`.doc-bridge/index.json`, `handoffs.react-native`).

## API e contratos

Exports de `packages/react-native/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `useChat` | hook | Estado e ações do chat sobre `createChatController`, sem DOM. | `packages/react-native/src/index.ts:1`; `packages/react-native/src/useChat.ts` |
| `ChatContainer` | componente | Contêiner headless do chat, em primitivas RN. | `packages/react-native/src/index.ts:3` |
| `Message` | componente | Renderiza uma mensagem. | `packages/react-native/src/index.ts:4` |
| `InputBar` | componente | Campo de entrada do chat. | `packages/react-native/src/index.ts:5` |
| `Markdown` | componente | Renderiza Markdown. | `packages/react-native/src/index.ts:6` |
| `CodeBlock` | componente | Bloco de código. | `packages/react-native/src/index.ts:7` |
| `ToolCallView` | componente | Exibe uma chamada de ferramenta. | `packages/react-native/src/index.ts:8` |
| `ThinkingIndicator` | componente | Indicador de processamento. | `packages/react-native/src/index.ts:9` |
| `ToolConfirmation` | componente | Confirmação de chamada de ferramenta. | `packages/react-native/src/index.ts:10` |
| `ChatContainerProps`, `MessageProps`, `InputBarProps`, `MarkdownProps`, `CodeBlockProps`, `ToolCallViewProps`, `ThinkingIndicatorProps`, `ToolConfirmationProps` | tipos | Props dos componentes acima. | `packages/react-native/src/index.ts:13-20` |

Exemplo real do README (imports do pacote):

```tsx
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react-native'
import { anthropic } from '@agentskit/adapters'
```

Fonte: `packages/react-native/README.md:58-59`; o fixture `packages/react-native/fixtures/readme-quickstart.tsx` repete o trecho.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/react-native/package.json:50`, `"@agentskit/core": "workspace:*"`) |
| Peers | `react ^18 || ^19`, `react-native *` (`packages/react-native/CONVENTIONS.md:7`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/react-native`. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/react-native.mdx` (`.doc-bridge/index.json`, `handoffs.react-native`) |

## Dados e efeitos

- Nenhuma leitura de variáveis de ambiente em `packages/react-native/src`. O README e o fixture configuram o adapter com `process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY` (`packages/react-native/README.md:63`; `packages/react-native/fixtures/readme-quickstart.tsx:6`); o pacote não lê esse valor.
- Hermes não tem `TextDecoder` nem Web Streams: o consumidor deve aplicar polyfill antes de usar o pacote (`packages/react-native/CONVENTIONS.md:38`).
- Não depender de módulos Node (`Buffer`, `stream`, `crypto`), porque o Metro não os resolve (`packages/react-native/CONVENTIONS.md:40`).
- Sem permissões ou capabilities exigidas além do ambiente React Native.

## Como mexer (para agentes)

- **Comece por:** `packages/react-native/CONVENTIONS.md`, `packages/react-native/src/index.ts` e `packages/react-native/src/useChat.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/react-native.mdx`.
- **Raiz de edição do handoff:** `packages/react-native` (`.doc-bridge/index.json`, `handoffs.react-native`).
- **Invariantes:** Hermes não oferece `TextDecoder` / Web Streams; o consumidor precisa aplicar polyfill antes (`packages/react-native/CONVENTIONS.md:38`). Ausência desses recursos deve falhar de forma previsível, não em silêncio (`packages/react-native/CONVENTIONS.md:62`).
- **Testes:** `packages/react-native/tests/useChat.test.ts` (hook), `packages/react-native/tests/components.test.tsx` (componentes), `packages/react-native/tests/react-native.mock.tsx` (mock das primitivas RN; `CONVENTIONS.md:47` explica que as primitivas não renderizam sob happy-dom) e `packages/react-native/tests/package-manifest.test.ts` (manifesto).
- **Validação:** `pnpm --filter @agentskit/react-native test` (executa `turbo run build` e `vitest run`, `packages/react-native/package.json:44`) e `pnpm --filter @agentskit/react-native lint` (`tsc --noEmit`, `packages/react-native/package.json:46`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilha:** tratar o pacote como fork de `@agentskit/react` e copiar código DOM (`packages/react-native/CONVENTIONS.md:63`).
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Regras de composição e dependência]]. Histórico recente (`git log --oneline -8 -- packages/react-native`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `1fffa79c docs(react-native): document public API (#1784)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/react-native/package.json:1` — manifesto, dependências (`:50`) e scripts (`:44`, `:46`).
> - `packages/react-native/src/index.ts:1` — entrada pública.
> - `packages/react-native/README.md:58` — exemplo de import.
> - `packages/react-native/CONVENTIONS.md:38` — invariantes de runtime (Hermes) e de Node.
> - `apps/docs-next/content/docs/for-agents/react-native.mdx:1` — handoff documental de agentes.
