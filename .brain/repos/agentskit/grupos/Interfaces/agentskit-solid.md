---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/solid"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/solid/package.json", "packages/solid/src/index.ts", "packages/solid/src/useChat.ts", "packages/solid/README.md", "packages/solid/fixtures/readme-quickstart.tsx", "apps/docs-next/content/docs/for-agents/solid.mdx", "AGENTS.md", "packages/solid/CONVENTIONS.md", "packages/solid/tests/components.test.ts", "packages/solid/tests/package-manifest.test.ts", "packages/solid/tests/useChat.test.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0022-public-package-consolidation.md", "docs/architecture/adrs/0033-registry-ecosystem-shell.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-solid

> [!tldr] Em linguagem comum
> Binding do AgentsKit para SolidJS: o hook `useChat` guarda o estado do chat em um store reativo e se limpa quando o componente é desmontado, e há oito componentes de interface sem estilo fixo.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

Binding SolidJS do contrato `ChatReturn` compartilhado. O hook `useChat(config)` usa `createStore` e `onCleanup` e devolve a forma `ChatReturn` por meio de um proxy reativo; há oito componentes headless que usam apenas `data-ak-*` (`packages/solid/CONVENTIONS.md:3-4`, `:10-12`). Peer declarado: `solid-js ^1.8` (`packages/solid/CONVENTIONS.md:6`). O pacote depende de `@agentskit/core` (`packages/solid/package.json:53`). Além da entrada principal, o manifesto expõe o subpath `./use-chat` (`packages/solid/package.json:36-39`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/solid.mdx` e limita edições a `packages/solid` (`.doc-bridge/index.json`, `handoffs.solid`).

## API e contratos

Exports de `packages/solid/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `useChat` | hook | Estado do chat em store reativo, na forma `ChatReturn`. Limpa o controlador com `onCleanup`. | `packages/solid/src/index.ts:1`; `packages/solid/src/useChat.ts` |
| `ChatContainer` | componente | Contêiner headless do chat. | `packages/solid/src/index.ts:4` |
| `Message` | componente | Renderiza uma mensagem. | `packages/solid/src/index.ts:5` |
| `InputBar` | componente | Campo de entrada do chat. | `packages/solid/src/index.ts:6` |
| `Markdown` | componente | Renderiza Markdown. | `packages/solid/src/index.ts:7` |
| `CodeBlock` | componente | Bloco de código. | `packages/solid/src/index.ts:8` |
| `ToolCallView` | componente | Exibe uma chamada de ferramenta. | `packages/solid/src/index.ts:9` |
| `ThinkingIndicator` | componente | Indicador de processamento. | `packages/solid/src/index.ts:10` |
| `ToolConfirmation` | componente | Confirmação de chamada de ferramenta. | `packages/solid/src/index.ts:11` |
| `ChatContainerProps`, `MessageProps`, `InputBarProps`, `MarkdownProps`, `CodeBlockProps`, `ToolCallViewProps`, `ThinkingIndicatorProps`, `ToolConfirmationProps` | tipos | Props dos componentes acima. | `packages/solid/src/index.ts:15-22` |

Exemplo real de uso do subpath, em teste de manifesto:

```ts
const mod = await import('@agentskit/solid/use-chat') as { useChat: unknown }
```

Fonte: `packages/solid/tests/package-manifest.test.ts:44`. O exemplo do README usa a entrada principal: `import { useChat, ChatContainer, Message, InputBar } from '@agentskit/solid'` (`packages/solid/README.md:55`).

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/solid/package.json:53`, `"@agentskit/core": "workspace:*"`) |
| Peer | `solid-js ^1.8` (`packages/solid/CONVENTIONS.md:6`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/solid` (busca por `"@agentskit/solid"` retorna só o próprio pacote). |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/solid.mdx` (`.doc-bridge/index.json`, `handoffs.solid`) |

## Dados e efeitos

- Nenhuma leitura de variáveis de ambiente em `packages/solid/src`. O README e o fixture de início rápido usam `import.meta.env.VITE_ANTHROPIC_API_KEY` só como exemplo de configuração do adapter (`packages/solid/README.md:61`; `packages/solid/fixtures/readme-quickstart.tsx:7`). O valor nunca é lido pelo pacote.
- O hook é de uso exclusivo do cliente; o `CONVENTIONS.md` lista como armadilha usá-lo em SolidStart SSR sem guarda (`packages/solid/CONVENTIONS.md:55`).
- Sem permissões ou capabilities exigidas além do ambiente de navegador.

## Como mexer (para agentes)

- **Comece por:** `packages/solid/CONVENTIONS.md`, `packages/solid/src/index.ts` e `packages/solid/src/useChat.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/solid.mdx`.
- **Raiz de edição do handoff:** `packages/solid` (`.doc-bridge/index.json`, `handoffs.solid`).
- **Invariantes:**
  - Não desestruturar campos reativos para fora do proxy do store; o consumidor perde a reatividade (`packages/solid/CONVENTIONS.md:28`).
  - Não criar estado global; cada `useChat` possui seu controlador (`packages/solid/CONVENTIONS.md:30`).
- **Testes:** `packages/solid/tests/useChat.test.ts` (hook), `packages/solid/tests/components.test.ts` (componentes) e `packages/solid/tests/package-manifest.test.ts` (manifesto, subpaths e entradas).
- **Validação:** `pnpm --filter @agentskit/solid test` (executa `turbo run build` e `vitest run`, `packages/solid/package.json:47`) e `pnpm --filter @agentskit/solid lint` (`tsc --noEmit`, `packages/solid/package.json:49`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilha:** hook cliente-only usado em SSR sem guarda (`packages/solid/CONVENTIONS.md:55`).
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados pelos documentos citados na fonte da nota: [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]], [[agentskit ADR-0033 - Registry adota o shell do ecossistema]]. Histórico recente (`git log --oneline -8 -- packages/solid`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/solid/package.json:1` — manifesto, dependências (`:53`), exports (`:36-39`) e scripts (`:47`, `:49`).
> - `packages/solid/src/index.ts:1` — entrada pública.
> - `packages/solid/README.md:55` — exemplo de import.
> - `packages/solid/CONVENTIONS.md:28` — invariantes de reatividade.
> - `apps/docs-next/content/docs/for-agents/solid.mdx:1` — handoff documental de agentes.
