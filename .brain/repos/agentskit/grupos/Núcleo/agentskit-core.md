---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/core"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/core/package.json", "packages/core/src/index.ts", "packages/core/src/memory.ts", "apps/docs-next/content/docs/for-agents/core.mdx", "AGENTS.md", "packages/core/CONVENTIONS.md", "packages/core/README.md", "packages/core/tests/a2a.test.ts", "packages/core/tests/agent-loop.test.ts", "packages/core/tests/agent-schema.test.ts", "packages/core/tests/agent-substrate.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0003-memory-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-core

> [!tldr] Em linguagem comum
> Base do AgentsKit: define os tipos dos contratos (adaptador, ferramenta, memória, recuperador, skill, runtime) e as funções básicas de chat. Não chama modelo de IA nem tem dependências de execução.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/core` publica a superfície definida em `packages/core/src/index.ts`. Ele é o alicerce do ecossistema: contratos e primitivas que os demais pacotes reutilizam, sem SDK de fornecedor, sem React e sem I/O de arquivos (`packages/core/CONVENTIONS.md:3-26`). O índice Doc Bridge aponta a leitura inicial para `apps/docs-next/content/docs/for-agents/core.mdx` e limita edições a `packages/core` (`.doc-bridge/index.json`, `handoffs.core`).

## API e contratos

Exports de topo de `packages/core/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatController` | função | Controlador headless de sessão de chat | `packages/core/src/index.ts:1` |
| `AgentsKitError`, `AdapterError`, `ToolError`, `MemoryError`, `ConfigError`, `RuntimeError`, `SandboxError`, `SkillError`, `ErrorCodes` | classes de erro e catálogo de códigos | Erros tipados `AK_*` | `packages/core/src/index.ts:2-12` |
| `createInMemoryMemory` | função | Memória de mensagens em memória do processo | `packages/core/src/index.ts:13` (`src/memory.ts:31`) |
| `createLocalStorageMemory` | função | Memória de mensagens em `localStorage` do navegador | `packages/core/src/index.ts:13` (`src/memory.ts:52`) |
| `serializeMessages`, `deserializeMessages` | funções | Converter mensagens de/para o registro versionado (`version: 1`) | `packages/core/src/index.ts:13` (`src/memory.ts:8`, `:19`) |
| `createStaticRetriever`, `formatRetrievedDocuments` | funções | Recuperador com documentos fixos e formatação dos documentos recuperados | `packages/core/src/index.ts:14` |
| `createId`, `generateId`, `buildMessage`, `executeToolCall`, `consumeStream`, `createEventEmitter`, `parseToolArgs`, `safeParseArgs`, `isRecord`, `createToolLifecycle` | funções | Primitivas compartilhadas entre pacotes (`src/primitives.ts`) | `packages/core/src/index.ts:15-26` |
| `defineTool` | função | Declarar uma ferramenta tipada | `packages/core/src/index.ts:27` |
| `compileBudget`, `approximateCounter` | funções | Compor o orçamento de contexto e contar tokens de forma aproximada | `packages/core/src/index.ts:28` |
| `createProgressiveArgParser`, `executeToolProgressively` | funções | Ler e executar argumentos de ferramenta em streaming | `packages/core/src/index.ts:34` |
| `createVirtualizedMemory` | função | Memória virtualizada | `packages/core/src/index.ts:35` |
| `textPart`, `imagePart`, `audioPart`, `videoPart`, `filePart`, `partsToText`, `normalizeContent`, `filterParts` | funções | Partes de conteúdo multimodal | `packages/core/src/index.ts:37-46` |
| `buildToolMap`, `activateSkills`, `executeSafeTool` | funções | Mapa de ferramentas, ativação de skills e execução segura de ferramenta | `packages/core/src/index.ts:63` |
| Tipos de contrato (`ChatMemory`, `Message`, `ToolDefinition`, `Retriever`, `AdapterFactory`, `ChatController`, `ToolAuthorizer`, `ToolDecisionStore`, `VectorMemory`, `Observer` e outros) | tipos | Contratos públicos dos seis contratos centrais e tipos auxiliares | `packages/core/src/index.ts:29-126`, `:128-129` |

Exemplo real (do README do pacote, `packages/core/README.md:52-61`):

```ts
import { createChatController, createInMemoryMemory } from '@agentskit/core'
```

Subpaths publicados em `packages/core/package.json:36-119` (`./agent-schema`, `./a2a`, `./hash`, `./eval-format`, `./hitl`, entre outros) não passam pela entrada principal.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | Nenhuma: `packages/core/package.json` declara só `devDependencies` (`:132-139`). |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/core.mdx` (`.doc-bridge/index.json`, `handoffs.core`) |
| Consumidores dentro do repo | 39 manifestos declaram `@agentskit/core` (busca em `packages` e `apps`, commit `9f8d8551`). Pacotes: `adapters`, `angular`, `cli`, `cross-platform`, `eval`, `eval-braintrust`, `ink`, `integrations`, `mcp`, `memory`, `net`, `observability`, `observability-langfuse`, `rag`, `react`, `react-native`, `runtime`, `sandbox`, `skills`, `solid`, `svelte`, `templates`, `tools`, `validation`, `vue`. Apps: `ask-backend`, `docs-next`, `registry`, `visual-react` e os `example-*`. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Armazenamento: `createLocalStorageMemory` lê e grava `localStorage` do navegador usando a chave passada pelo chamador (`packages/core/src/memory.ts:52-98`). Sem `localStorage` disponível, load e save voltam sem erro (`memory.ts:55`, `:72`, `:85`). `createInMemoryMemory` guarda tudo em memória do processo (`memory.ts:31`).
- Variáveis de ambiente: nenhuma verificada nesta auditoria.
- Rede e arquivos: nenhum acesso verificado nos módulos de entrada; a validação de memória é carregada sob demanda para não entrar no grafo estático (`memory.ts:59-60`).

## Como mexer (para agentes)

- **Comece por:** `packages/core/src/index.ts` (superfície pública), `packages/core/CONVENTIONS.md` (regras do pacote) e `packages/core/src/controller.ts` (controlador de chat).
- **Raiz de edição do handoff:** `packages/core` (`.doc-bridge/index.json`, `handoffs.core`).
- **Invariantes** (`packages/core/CONVENTIONS.md:7-11`, `:49-53`):
  - Zero dependências de runtime: `dependencies` ausente em `packages/core/package.json`; não adicionar nenhuma.
  - Menos de 10 KB gzip: a CI mede o custo real de importação com `size-limit` e `scripts/size-core-closure.mjs` (raiz: `package.json:66`). Código de subpath não entra no grafo estático de `src/index.ts`; carregar com `await import(...)`, como em `memory.ts:60`.
  - Exports nomeados apenas; sem `any` (usar `unknown` e type guards).
  - Alterar tipo exportado ou criar export novo exige ADR antes (`CONVENTIONS.md:49-53`).
- **Testes:** `packages/core/tests/` (ex.: `a2a.test.ts`, `agent-loop.test.ts`, `agent-schema.test.ts`, `agent-substrate.test.ts`, `auto-summarize.test.ts`, `budget.test.ts`, `compose-tool.test.ts`, `content.test.ts`, `controller.test.ts`, `memory.test.ts`, `rag.test.ts`, `primitives.test.ts`). Os testes usam apenas exports públicos (`CONVENTIONS.md:32`).
- **Validação do pacote:** `pnpm --filter @agentskit/core test` (`packages/core/package.json:127`), `pnpm --filter @agentskit/core lint` (`:129`, `tsc --noEmit`) e, na raiz, `pnpm size` para o orçamento de bundle (`package.json:66`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas:** adicionar primitivo que só um pacote usa (regra de uso em 2+ pacotes, `CONVENTIONS.md:31`); importar módulo de subpath na entrada principal e estourar o orçamento de 10 KB.
- **Quem revisa:** `CONVENTIONS.md:55-63` (checklist do pacote).

## Decisões e história

ADRs que afetam os contratos deste pacote: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0008 - Validação de argumentos em runtime]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0013 - Validação em runtime de registros de mensagem serializados]], [[agentskit ADR-0014 - Proposta confiável de chamada de ferramenta pela aplicação]], [[agentskit ADR-0015 - Autorização de ferramenta antes da proposta e da execução]], [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]], [[agentskit ADR-0023 - Perfil estrito de qualidade da documentação do ecossistema]], [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]], [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]], [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]], [[agentskit ADR-0039 - IDs criptográficos para identificadores gerados]], [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]], [[agentskit ADR-0041 - Serializar anexos na fronteira do provedor]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]].

Histórico recente (`git log --oneline -15 -- packages/core`, já listado na versão anterior desta nota e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `677f7e22 fix(core): ordered, idempotent durable tool decisions (follow-ups to #1828) (#1833)`
- `8bf15b0a feat(core): durable tool decisions and multimodal sends (#1828)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `d10ad3ef chore(guardrails): forbid weak Math.random identifiers (#1769)`
- `a4a37be0 fix(core): bound streamed JWKS reads (#1761)`

> [!question] Dúvida: uso no law-os
> A versão anterior desta nota descrevia o uso do core no law-os (`buildMessage`, `safeParseArgs`, `apps/law-os/backend/compose.mjs:139`) e links para notas `law-os - ...` e `Revisão de contratos - law-os`. Essas notas e o repositório law-os não estão neste vault nem neste worktree; a afirmação não foi verificada e foi retirada desta versão. Confirmar em outra auditoria com o commit de law-os citado.

> [!info]- Detalhe técnico
> - `packages/core/package.json:1` — manifesto, versão, `engines` e scripts.
> - `packages/core/src/index.ts:1` — entrada pública.
> - `packages/core/src/memory.ts:52` — `createLocalStorageMemory`.
> - `apps/docs-next/content/docs/for-agents/core.mdx:1` — handoff documental de agentes.
> - `packages/core/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
