---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/vue"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/vue/package.json", "packages/vue/src/index.ts", "packages/vue/src/useChat.ts", "packages/vue/README.md", "apps/docs-next/content/docs/for-agents/vue.mdx", "AGENTS.md", "packages/vue/CONVENTIONS.md", "packages/vue/tests/components.test.ts", "packages/vue/tests/package-manifest.test.ts", "packages/vue/tests/useChat.test.ts", "docs/architecture/adrs/0007-docs-platform-fumadocs.md", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-vue

> [!tldr] Em linguagem comum
> Binding do AgentsKit para Vue 3: o composable `useChat` mantém o estado do chat reativo e se encerra quando o componente é desmontado, e os componentes de interface não trazem estilo fixo.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

Binding Vue 3 do contrato `ChatReturn` compartilhado. O composable `useChat(config)` usa `reactive()` e registra a limpeza em `onScopeDispose`; os componentes são headless e expõem ganchos `data-ak-*` (`packages/vue/CONVENTIONS.md:3-4`, `:10-11`). Peer declarado: `vue ^3.4` (`packages/vue/CONVENTIONS.md:6`). O pacote depende de `@agentskit/core` (`packages/vue/package.json:50`), que contém a lógica do controlador; o binding não a reimplementa (`packages/vue/CONVENTIONS.md`, seção de escopo). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/vue.mdx` e limita edições a `packages/vue` (`.doc-bridge/index.json`, `handoffs.vue`).

## API e contratos

Exports de `packages/vue/src/index.ts` (o JSDoc não cobre estes símbolos; a descrição vem do nome e do `CONVENTIONS.md`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `useChat` | função (composable) | Estado de chat reativo, ligado ao escopo do componente (`onScopeDispose`). Deve ser chamado dentro de `setup()` ou `<script setup>`. | `packages/vue/src/index.ts:1`; `packages/vue/src/useChat.ts` |
| `ChatContainer` | componente | Contêiner headless do chat. | `packages/vue/src/index.ts:2`; `packages/vue/src/ChatContainer.ts` |
| `ChatRoot` | componente | Reexportado de `./components`; a finalidade não está documentada no código auditado (ver `packages/vue/src/components.ts`). | `packages/vue/src/index.ts:4` |
| `Message` | componente | Renderiza uma mensagem. | `packages/vue/src/index.ts:5` |
| `InputBar` | componente | Campo de entrada do chat. | `packages/vue/src/index.ts:6` |
| `Markdown` | componente | Renderiza Markdown. | `packages/vue/src/index.ts:7` |
| `CodeBlock` | componente | Bloco de código. | `packages/vue/src/index.ts:8` |
| `ToolCallView` | componente | Exibe uma chamada de ferramenta. | `packages/vue/src/index.ts:9` |
| `ThinkingIndicator` | componente | Indicador de processamento. | `packages/vue/src/index.ts:10` |
| `ToolConfirmation` | componente | Confirmação de chamada de ferramenta. | `packages/vue/src/index.ts:11` |

Exemplo real do README (imports do pacote):

```ts
import { useChat } from '@agentskit/vue'
import type { ChatConfig } from '@agentskit/core'
```

Fonte: `packages/vue/README.md:54-55`. Os componentes de `./components` e os tipos de props não estão listados aqui; confira `packages/vue/src/components.ts` antes de depender deles.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/vue/package.json:50`, `"@agentskit/core": "workspace:*"`) |
| Peer | `vue ^3.4` (`packages/vue/CONVENTIONS.md:6`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/vue` (busca por `"@agentskit/vue"` em `package.json` retorna só o próprio pacote). |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/vue.mdx` (`.doc-bridge/index.json`, `handoffs.vue`) |

## Dados e efeitos

- Nenhuma leitura de variáveis de ambiente em `packages/vue/src` (busca por `process.env` e `import.meta.env` sem resultado).
- O composable faz chamadas de rede pelo adapter que o consumidor injeta; por isso o `CONVENTIONS.md` pede que o uso em SSR ou Nuxt seja envolvido em `<ClientOnly>` ou com `ssr: false` (`packages/vue/CONVENTIONS.md:43-44`).
- Sem permissões ou capabilities exigidas além do ambiente de navegador.

## Como mexer (para agentes)

- **Comece por:** `packages/vue/CONVENTIONS.md`, `packages/vue/src/index.ts` e `packages/vue/src/useChat.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/vue.mdx`.
- **Raiz de edição do handoff:** `packages/vue` (`.doc-bridge/index.json`, `handoffs.vue`).
- **Invariantes:**
  - `useChat` deve ser chamado dentro de `setup()` ou `<script setup>`, para que o escopo de efeitos seja dono da limpeza (`packages/vue/CONVENTIONS.md:29`).
  - O retorno é um objeto reativo; o consumidor não deve desestruturá-lo (`packages/vue/CONVENTIONS.md:31`).
  - Não criar estado global; cada chamada possui seu controlador (`packages/vue/CONVENTIONS.md:33`).
- **Testes:** `packages/vue/tests/useChat.test.ts` (composable), `packages/vue/tests/components.test.ts` (componentes) e `packages/vue/tests/package-manifest.test.ts` (manifesto e entradas).
- **Validação:** `pnpm --filter @agentskit/vue test` (executa `turbo run build` e `vitest run`, `packages/vue/package.json:44`) e `pnpm --filter @agentskit/vue lint` (`tsc --noEmit`, `packages/vue/package.json:46`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas:** chamar `useChat` fora de `setup` (`packages/vue/CONVENTIONS.md:59`); rodar o composable durante SSR do Nuxt (`packages/vue/CONVENTIONS.md:61`).
- **Quem revisa:** não há responsável declarado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0020 - Estado de interação serializável]]. Histórico recente (`git log --oneline -8 -- packages/vue`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/vue/package.json:1` — manifesto, versão, dependências (`:50`) e scripts (`:44`, `:46`).
> - `packages/vue/src/index.ts:1` — entrada pública (composable e componentes).
> - `packages/vue/README.md:54` — exemplo de import.
> - `packages/vue/CONVENTIONS.md:29` — invariantes de uso e escopo.
> - `apps/docs-next/content/docs/for-agents/vue.mdx:1` — handoff documental de agentes.
