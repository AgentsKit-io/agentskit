---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/svelte"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/svelte/package.json", "packages/svelte/src/index.ts", "packages/svelte/src/useChat.ts", "packages/svelte/README.md", "apps/docs-next/content/docs/for-agents/svelte.mdx", "AGENTS.md", "packages/svelte/CONVENTIONS.md", "packages/svelte/vitest.ssr.config.ts", "packages/svelte/tests/components.test.ts", "packages/svelte/tests/package-manifest.test.ts", "packages/svelte/tests/ssr.test.ts", "packages/svelte/tests/store.test.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-svelte

> [!tldr] Em linguagem comum
> Binding do AgentsKit para Svelte 5: um store de chat (`createChatStore`) que pode ser lido com `$chat`, e oito componentes de interface sem estilo fixo.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

Binding Svelte 5 do contrato `ChatReturn` compartilhado, com API baseada em store e oito componentes `.svelte` headless (`packages/svelte/CONVENTIONS.md:3-4`). `createChatStore(config)` devolve `SvelteChatStore`, um `Readable<ChatState>` (com `subscribe` e `$chat`) mais as ações (`packages/svelte/CONVENTIONS.md:11-12`). Peer declarado: `svelte ^5`; publicado como ESM com condição de export `svelte` e empacotado com `@sveltejs/package` (`packages/svelte/CONVENTIONS.md:6-7`). O pacote depende de `@agentskit/core` (`packages/svelte/package.json:49`), que contém o controlador. O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/svelte.mdx` e limita edições a `packages/svelte` (`.doc-bridge/index.json`, `handoffs.svelte`).

## API e contratos

Exports de `packages/svelte/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatStore` | função | Cria o store de chat (`SvelteChatStore`). | `packages/svelte/src/index.ts:1` |
| `SvelteChatStore` | tipo | Store com `subscribe`/`$chat` mais as ações do chat. | `packages/svelte/src/index.ts:3` |
| `ChatContainer` | componente `.svelte` | Região rolável que acompanha mudanças no conteúdo. | `packages/svelte/src/index.ts:6` |
| `Message` | componente `.svelte` | Renderiza uma mensagem com avatar e ações opcionais. | `packages/svelte/src/index.ts:8` |
| `InputBar` | componente `.svelte` | Campo de texto e botão de envio ligados ao store. | `packages/svelte/src/index.ts:10` |
| `Markdown` | componente `.svelte` | Renderiza conteúdo com marcador opcional de streaming. | `packages/svelte/src/index.ts:12` |
| `CodeBlock` | componente `.svelte` | Bloco de código com cópia opcional para a área de transferência. | `packages/svelte/src/index.ts:14` |
| `ToolCallView` | componente `.svelte` | Resumo de chamada de ferramenta com argumentos e resultado expansíveis. | `packages/svelte/src/index.ts:16` |
| `ThinkingIndicator` | componente `.svelte` | Indicador de raciocínio, exibido quando `visible` é verdadeiro. | `packages/svelte/src/index.ts:18` |
| `ToolConfirmation` | componente `.svelte` | Controles de aprovação enquanto uma chamada aguarda confirmação. | `packages/svelte/src/index.ts:20` |

Exemplo real do README (import do store e do tipo de configuração):

```svelte
import { createChatStore } from '@agentskit/svelte'
import type { ChatConfig } from '@agentskit/core'
```

Fonte: `packages/svelte/README.md:54-55`. As descrições dos componentes vêm do JSDoc de `packages/svelte/src/index.ts:5-20`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/svelte/package.json:49`, `"@agentskit/core": "workspace:*"`) |
| Peer | `svelte ^5` (`packages/svelte/CONVENTIONS.md:6`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/svelte` (busca por `"@agentskit/svelte"` retorna só o próprio pacote). |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/svelte.mdx` (`.doc-bridge/index.json`, `handoffs.svelte`) |

## Dados e efeitos

- Nenhuma leitura de variáveis de ambiente em `packages/svelte/src` (busca por `process.env` e `import.meta.env` sem resultado).
- Adapters que fazem chamadas de rede não devem iniciar durante SSR; adie para `onMount` ou para um endpoint do servidor (`packages/svelte/CONVENTIONS.md:61`).
- Sem permissões ou capabilities exigidas além do ambiente de execução do Svelte.

## Como mexer (para agentes)

- **Comece por:** `packages/svelte/CONVENTIONS.md`, `packages/svelte/src/index.ts` e `packages/svelte/src/useChat.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/svelte.mdx`.
- **Raiz de edição do handoff:** `packages/svelte` (`.doc-bridge/index.json`, `handoffs.svelte`).
- **Invariantes:**
  - Sem efeitos colaterais de navegador no nível do módulo: os componentes precisam renderizar no servidor (`packages/svelte/CONVENTIONS.md:27`); os componentes empacotados devem continuar renderizáveis em SSR (`packages/svelte/CONVENTIONS.md:45`).
  - Não reimplementar a lógica do controlador; apenas envolver `createChatController` (`packages/svelte/CONVENTIONS.md:35`).
- **Testes:** `packages/svelte/tests/store.test.ts` (store), `packages/svelte/tests/components.test.ts` (componentes), `packages/svelte/tests/ssr.test.ts` (renderização no servidor) e `packages/svelte/tests/package-manifest.test.ts` (manifesto).
- **Validação:** `pnpm --filter @agentskit/svelte test` executa `turbo run build`, `vitest run` e `vitest run --config vitest.ssr.config.ts` (`packages/svelte/package.json:43`); `pnpm --filter @agentskit/svelte lint` executa `tsc --noEmit` (`packages/svelte/package.json:45`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas:** iniciar adapters de rede durante SSR (`packages/svelte/CONVENTIONS.md:61`).
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0020 - Estado de interação serializável]]. Histórico recente (`git log --oneline -8 -- packages/svelte`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `8bf15b0a feat(core): durable tool decisions and multimodal sends (#1828)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/svelte/package.json:1` — manifesto, dependências (`:49`) e scripts (`:43`, `:45`).
> - `packages/svelte/src/index.ts:1` — entrada pública (store e componentes `.svelte`).
> - `packages/svelte/README.md:54` — exemplo de import.
> - `packages/svelte/CONVENTIONS.md:27` — invariantes de SSR e escopo.
> - `apps/docs-next/content/docs/for-agents/svelte.mdx:1` — handoff documental de agentes.
