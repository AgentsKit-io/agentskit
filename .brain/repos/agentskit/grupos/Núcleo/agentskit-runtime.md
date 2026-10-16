---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/runtime"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/runtime/package.json", "packages/runtime/src/index.ts", "packages/runtime/src/durable.ts", "packages/runtime/README.md", "apps/docs-next/content/docs/for-agents/runtime.mdx", "AGENTS.md", "packages/runtime/CONVENTIONS.md", "packages/runtime/tests/agent-substrate.test.ts", "packages/runtime/tests/background.test.ts", "packages/runtime/tests/chat-trigger.test.ts", "packages/runtime/tests/delegates.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0004-retriever-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-runtime

> [!tldr] Em linguagem comum
> Executa agentes: roda o laço de raciocínio e uso de ferramentas, delega tarefas a outros agentes, aplica filas, cotas, gatilhos de chat e fluxos. É o pacote que transforma a configuração de um agente em uma execução.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/runtime` implementa o contrato de runtime (ADR 0006) sobre `@agentskit/core`. `createRuntime` é a entrada única para execução headless; o resto da superfície cobre delegação, topologias multiagente, execução durável, fluxos, cotas e validação de saída (`packages/runtime/src/index.ts`). Ele não contém código de fornecedor de modelo: isso fica em `@agentskit/adapters` (`packages/runtime/CONVENTIONS.md:12-17`). O índice Doc Bridge limita as edições a `packages/runtime` (`.doc-bridge/index.json`, `handoffs.runtime`).

## API e contratos

Exports de topo de `packages/runtime/src/index.ts` (linhas verificadas no commit `9f8d8551`; tipos entre parênteses):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createRuntime` | função | Entrada headless de execução de agente | `src/index.ts:1` |
| `invokeStructured` | função | Chamada com saída estruturada | `src/index.ts:2` |
| `piiDenyValidator` | função | Validador que nega conteúdo com PII | `src/index.ts:3` |
| `createSharedContext` (`SharedContext`, `ReadonlySharedContext`) | função e tipos | Contexto compartilhado com delegados | `src/index.ts:4-5` |
| (`RuntimeConfig`, `RunOptions`, `RunResult`, `DelegateConfig`) | tipos | Configuração, opções e resultado de execução | `src/index.ts:6` |
| `createDurableRunner`, `createInMemoryStepLog`, `createFileStepLog` (`StepLogStore`, `StepRecord`, `DurableRunnerOptions`, `DurableRunner`, `DurableEvent`) | funções e tipos | Execução durável com log de passos; log em memória ou em arquivo | `src/index.ts:7-18` (`src/durable.ts:243`) |
| `supervisor`, `swarm`, `hierarchical`, `blackboard` (+ tipos) | funções e tipos | Topologias de múltiplos agentes | `src/index.ts:19-34` |
| `DEFAULT_TOPOLOGY_CONCURRENCY`, `InMemoryScratchpadStore`, `resolveConcurrency`, `settleWithConcurrency` (+ tipos) | constante, classe e funções | Base de concorrência dos handlers multiagente | `src/index.ts:38-55` |
| `createCompareHandler` (+ tipos) | função | Handler de comparação entre respostas | `src/index.ts:56-61` |
| `createVoteHandler` (+ tipos) | função | Handler de votação | `src/index.ts:62-63` |
| `createDebateHandler` (+ tipo) | função | Handler de debate | `src/index.ts:64-65` |
| `createAuctionHandler` (+ tipos) | função | Handler de leilão de candidatos | `src/index.ts:66-67` |
| `createCronScheduler`, `createWebhookHandler`, `parseSchedule`, `cronMatches` (+ tipos) | funções e tipos | Agendamento por cron e webhooks em segundo plano | `src/index.ts:68-82` |
| `compileFlow`, `validateFlow`, `flowToMermaid` (+ tipos) | funções e tipos | Compilar, validar e desenhar fluxos | `src/index.ts:83-100` |
| `speculate` (+ tipos) | função | Execução especulativa com escolha de candidato | `src/index.ts:101-108` |
| `createChatTrigger` (+ tipos) | função | Gatilho de chat para superfícies de mensagem | `src/index.ts:109-127` |
| `createQuotaTracker`, `withQuotas` (+ tipos) | funções e tipos | Cotas por ferramenta | `src/index.ts:129-137` |
| `createValidatorGuard`, `denyPattern`, `lengthRange`, `isJson` (+ tipos) | funções e tipos | Guarda de validação de saída | `src/index.ts:139-155` |

Exemplo real (README do pacote, `packages/runtime/README.md:52-56`):

```ts
import { createRuntime } from '@agentskit/runtime'
```

Subpath publicado: `@agentskit/runtime/shared-context` (`packages/runtime/package.json:36-40`).

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] e [[agentskit-net]] (`packages/runtime/package.json:52-55`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/runtime.mdx` (`.doc-bridge/index.json`, `handoffs.runtime`) |
| Consumidores dentro do repo | 10 manifestos declaram `@agentskit/runtime` (busca em `packages` e `apps`, commit `9f8d8551`): `packages/cli`, `packages/mcp`, `apps/docs-next`, e os exemplos `apps/example-discord-bot`, `apps/example-embedded` (inclui `raycast`), `apps/example-flow`, `apps/example-runtime`, `apps/example-slack-bot`, `apps/example-teams-bot`. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Arquivos: `createFileStepLog` cria e grava um log de passos em arquivo usando `node:fs/promises` (`packages/runtime/src/durable.ts:243-305`: criação em `:250`, acréscimo de registro em `:290`, reescrita em `:305`). Só ocorre quando o chamador escolhe esse log.
- Variáveis de ambiente: nenhuma lida em `packages/runtime/src` (busca por `process.env` sem resultado nesta auditoria).
- Rede: o pacote depende de `@agentskit/net` para HTTP com retentativas (`package.json:52-55`); chamadas de modelo passam por adaptadores, não pelo runtime.

## Como mexer (para agentes)

- **Comece por:** `packages/runtime/src/runner.ts` (implementação de `createRuntime`), `packages/runtime/src/index.ts` (superfície pública) e `packages/runtime/CONVENTIONS.md` (regras RT1–RT14).
- **Raiz de edição do handoff:** `packages/runtime` (`.doc-bridge/index.json`, `handoffs.runtime`).
- **Invariantes** (`packages/runtime/CONVENTIONS.md:29-46`, detalhados na ADR 0006): RT1 config sem I/O em `createRuntime`; RT2 um método `run(task, options?)`; RT3 opções sobrepõem config sem merge silencioso; RT4 limite `maxSteps` rígido; RT7 memória gravada só na fronteira de sucesso do run; RT9 observadores somente leitura; RT11 profundidade de delegação limitada; RT13 abort limpo; RT14 erros categorizados. Qualquer PR que toque o laço deve justificar cada invariante (`CONVENTIONS.md:48`).
- **Testes:** `packages/runtime/tests/` com 25 arquivos, entre eles `runner.test.ts`, `delegation.test.ts`, `durable.test.ts`, `flow.test.ts`, `multi-agent*.test.ts`, `topologies.test.ts`, `validator-guard.test.ts`, `quota.test.ts`, `integration.test.ts`. Testes de integração usam adaptadores simulados, sem rede (`CONVENTIONS.md:53`). Abort é obrigatório para mudança no laço (`CONVENTIONS.md:55`).
- **Validação do pacote:** `pnpm --filter @agentskit/runtime test` (`packages/runtime/package.json:47`) e `pnpm --filter @agentskit/runtime lint` (`:49`, `tsc --noEmit`). Cobertura de linhas: 90% (`CONVENTIONS.md:70`). Bundle abaixo de 15 KB gzip (`CONVENTIONS.md:69`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:59-65`): mesclar arrays de config e opções em silêncio; tornar `maxSteps` sobrescrevível em runtime; tratar erro de ferramenta como erro de adaptador (encerrar o laço); salvar memória em caso de falha.
- **Quem revisa:** checklist em `CONVENTIONS.md:67-73`.

## Decisões e história

ADRs que afetam este pacote (ADR 0006 é o contrato dele): [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0008 - Validação de argumentos em runtime]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0011 - Validação de requisições de entrada (gatilhos de chat)]], [[agentskit ADR-0019 - Operações canceláveis de ChatMemory]], [[agentskit ADR-0020 - Estado de interação serializável]], [[agentskit ADR-0021 - Manifesto versionado do ecossistema e afirmações com evidência]], [[agentskit ADR-0024 - Graduação de pacotes baseada em evidência]], [[agentskit ADR-0025 - Snapshots da API pública e matriz de compatibilidade]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]], [[agentskit ADR-0039 - IDs criptográficos para identificadores gerados]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]].

Histórico recente (`git log --oneline -15 -- packages/runtime`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `4616f921 fix(runtime): use abortable durable retry sleep (#1762)`
- `53c3b7a7 fix(runtime): use UUID flow run IDs (#1748)`

> [!question] Dúvida: uso no law-os
> A versão anterior desta nota afirmava que o law-os usa o runtime (`apps/law-os/backend/compose.mjs:139`, `apps/law-os/package.json:27`), que não há nó multiagente no grafo de revisão e que compare/vote/debate/auction não são usados. Essas afirmações dependem de notas `law-os - ...` e de um repositório que não está neste vault nem neste worktree. Foram retiradas desta versão até confirmação.

> [!info]- Detalhe técnico
> - `packages/runtime/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/runtime/src/index.ts:1` — entrada pública.
> - `packages/runtime/src/durable.ts:243` — `createFileStepLog`.
> - `apps/docs-next/content/docs/for-agents/runtime.mdx:1` — handoff documental de agentes.
> - `packages/runtime/CONVENTIONS.md:1` — invariantes RT1–RT14 e orientação de contribuição.
