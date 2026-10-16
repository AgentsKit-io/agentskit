---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/angular"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/angular/package.json", "packages/angular/src/index.ts", "packages/angular/src/chat.service.ts", "packages/angular/README.md", "apps/docs-next/content/docs/for-agents/angular.mdx", "AGENTS.md", "packages/angular/CONVENTIONS.md", "packages/angular/tests/components.test.ts", "packages/angular/tests/package-aot.test.ts", "packages/angular/tests/service.test.ts", "packages/angular/tests/setup.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-angular

> [!tldr] Em linguagem comum
> Binding do AgentsKit para Angular 18+: um serviço injetável (`AgentskitChat`) que expõe o estado do chat com Signals e RxJS, e oito componentes standalone sem estilo fixo.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

Binding Angular do contrato `ChatReturn` compartilhado. Publica um serviço injetável com Signals e RxJS e oito componentes standalone headless (`packages/angular/CONVENTIONS.md:3-4`). `AgentskitChat` é `@Injectable({ providedIn: 'root' })` e envolve `createChatController`; expõe `state: WritableSignal<ChatState | null>` (`packages/angular/CONVENTIONS.md:11-12`; `packages/angular/src/chat.service.ts`). Publicado como ESM com partial-Ivy AOT via `ng-packagr` (`packages/angular/CONVENTIONS.md:6`). Peers: `@angular/core ^18 || ^19 || ^20 || ^21` e `rxjs ^7` (`packages/angular/CONVENTIONS.md:7`). O pacote depende de `@agentskit/core` (`packages/angular/package.json:46`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/angular.mdx` e limita edições a `packages/angular` (`.doc-bridge/index.json`, `handoffs.angular`).

## API e contratos

Exports de `packages/angular/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentskitChat` | serviço injetável | Envolve `createChatController` e expõe o estado como Signal. | `packages/angular/src/index.ts:1`; `packages/angular/src/chat.service.ts` |
| `ChatContainerComponent` | componente standalone | Contêiner headless do chat. | `packages/angular/src/index.ts:3` |
| `MessageComponent` | componente standalone | Renderiza uma mensagem. | `packages/angular/src/index.ts:4` |
| `InputBarComponent` | componente standalone | Campo de entrada do chat. | `packages/angular/src/index.ts:5` |
| `MarkdownComponent` | componente standalone | Renderiza Markdown. | `packages/angular/src/index.ts:6` |
| `CodeBlockComponent` | componente standalone | Bloco de código. | `packages/angular/src/index.ts:7` |
| `ToolCallViewComponent` | componente standalone | Exibe uma chamada de ferramenta. | `packages/angular/src/index.ts:8` |
| `ThinkingIndicatorComponent` | componente standalone | Indicador de processamento. | `packages/angular/src/index.ts:9` |
| `ToolConfirmationComponent` | componente standalone | Confirmação de chamada de ferramenta. | `packages/angular/src/index.ts:10` |

Exemplo real do README (import de serviço e componentes):

```ts
import { AgentskitChat, ChatContainerComponent, MessageComponent } from '@agentskit/angular'
import { anthropic } from '@agentskit/adapters'
```

Fonte: `packages/angular/README.md:55-56`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/angular/package.json:46`, `"@agentskit/core": "workspace:*"`) |
| Peers | `@angular/core ^18 || ^19 || ^20 || ^21`, `rxjs ^7` (`packages/angular/CONVENTIONS.md:7`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/angular`. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/angular.mdx` (`.doc-bridge/index.json`, `handoffs.angular`) |

## Dados e efeitos

- Nenhuma leitura de variáveis de ambiente em `packages/angular/src` (busca por `process.env` e `import.meta.env` sem resultado).
- O serviço não cria controlador próprio: delega a `createChatController` de `@agentskit/core` (`packages/angular/CONVENTIONS.md:44`).
- O README usa `anthropic` de `@agentskit/adapters` na configuração, mas não há dependência de `@agentskit/adapters` no manifesto deste pacote; a configuração do adapter é responsabilidade do consumidor.
- Sem permissões ou capabilities exigidas além do ambiente Angular.

## Como mexer (para agentes)

- **Comece por:** `packages/angular/CONVENTIONS.md`, `packages/angular/src/index.ts` e `packages/angular/src/chat.service.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/angular.mdx`.
- **Raiz de edição do handoff:** `packages/angular` (`.doc-bridge/index.json`, `handoffs.angular`).
- **Invariantes:**
  - Ações assíncronas devem devolver a Promise do controlador, sem fire-and-forget (`packages/angular/CONVENTIONS.md:41`).
  - Não reimplementar a lógica do controlador; envolver apenas `createChatController` (`packages/angular/CONVENTIONS.md:44`).
  - Espelhar o conjunto de componentes do React e não criar primitivas de chat exclusivas do Angular (`packages/angular/CONVENTIONS.md:53`).
- **Testes:** `packages/angular/tests/service.test.ts` (serviço), `packages/angular/tests/components.test.ts` (componentes), `packages/angular/tests/package-aot.test.ts` (build AOT) e `packages/angular/tests/setup.ts`.
- **Validação:** `pnpm --filter @agentskit/angular test` (executa `turbo run build` e `vitest run`, `packages/angular/package.json:40`) e `pnpm --filter @agentskit/angular lint` (`tsc --noEmit`, `packages/angular/package.json:42`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0020 - Estado de interação serializável]]. Histórico recente (`git log --oneline -8 -- packages/angular`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/angular/package.json:1` — manifesto, dependências (`:46`) e scripts (`:40`, `:42`).
> - `packages/angular/src/index.ts:1` — entrada pública (serviço e componentes).
> - `packages/angular/src/chat.service.ts:1` — implementação do serviço `AgentskitChat`.
> - `packages/angular/README.md:55` — exemplo de import.
> - `packages/angular/CONVENTIONS.md:41` — invariantes de ações assíncronas e escopo.
> - `apps/docs-next/content/docs/for-agents/angular.mdx:1` — handoff documental de agentes.
