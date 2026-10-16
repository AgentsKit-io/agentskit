---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/observability"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/observability/package.json", "packages/observability/src/index.ts", "packages/observability/src/cost-store-contract.ts", "packages/observability/README.md", "apps/docs-next/content/docs/for-agents/observability.mdx", "AGENTS.md", "packages/observability/CONVENTIONS.md", "packages/observability/tests/postgres-contract.ts", "packages/observability/tests/cjs-smoke.cjs", "packages/observability/tests/audit-log.test.ts", "packages/observability/tests/console-logger.test.ts", "packages/observability/tests/cost-chargeback.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-observability

> [!tldr] Em linguagem comum
> Telemetria do AgentsKit: observadores que enviam eventos para LangSmith, Datadog, Axiom, New Relic e OpenTelemetry; controle de custo com limites e alertas; contagem de tokens; log de auditoria assinado; SLOs; e ferramentas de replay e devtools. Falhas dos observadores não devem derrubar a execução do agente.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

Escopo declarado no `CONVENTIONS.md`: integrações com provedores de telemetria (LangSmith, OpenTelemetry via OTLP, e sinks HTTP para Datadog, Axiom e New Relic) (`packages/observability/CONVENTIONS.md:12`), além de custo, auditoria, SLO, topologia, controle de produção, devtools e replay. A integração com Langfuse é um pacote separado, `@agentskit/observability-langfuse`, que depende deste (`packages/observability-langfuse/package.json:45`); ver a dúvida abaixo sobre o caminho de import. Dependências declaradas: `@agentskit/core` e `@agentskit/net` (`packages/observability/package.json:79-80`), e `@agentskit/cross-platform` (`packages/observability/package.json:118`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/observability.mdx` e limita edições a `packages/observability` (`.doc-bridge/index.json`, `handoffs.observability`).

> [!question] Dúvida
> `packages/observability/CONVENTIONS.md:12` diz que o Langfuse vem por `@agentskit/observability/langfuse`, mas `packages/observability/src/index.ts` não exporta nada de Langfuse, e o README de `observability-langfuse` importa de `@agentskit/observability/langfuse` (`packages/observability-langfuse/README.md:43`). Não confirmado qual é o caminho correto; ver [[Dúvidas abertas]].

## API e contratos

Exports de `packages/observability/src/index.ts`, agrupados por tema. Assinaturas e JSDoc completos estão nos arquivos indicados; a tabela só mapeia nomes e linhas.

| Símbolos | Tipo | Para que serve | Onde |
|---|---|---|---|
| `consoleLogger`, `ConsoleLoggerConfig` | função e tipo | Observador que escreve no console. | `packages/observability/src/index.ts:1-2` |
| `wrapObserverWithRedaction`, `ObserverRedactionOptions`, `ObserverRedactionMode` | função e tipos | Envolve um observador com redação de dados sensíveis. | `packages/observability/src/index.ts:4-8` |
| `langsmith`, `LangSmithConfig`, `LangSmithObserver` | função e tipos | Observador para LangSmith. | `packages/observability/src/index.ts:10-11` |
| `datadogSink`, `DatadogSinkConfig`, `DatadogSinkObserver` | função e tipos | Sink HTTP para Datadog. | `packages/observability/src/index.ts:13-14` |
| `axiomSink`, `AxiomSinkConfig`, `AxiomSinkObserver` | função e tipos | Sink HTTP para Axiom. | `packages/observability/src/index.ts:16-17` |
| `newRelicSink`, `NewRelicSinkConfig`, `NewRelicSinkObserver` | função e tipos | Sink HTTP para New Relic. | `packages/observability/src/index.ts:19-20` |
| `opentelemetry`, `OpenTelemetryConfig`, `OpenTelemetryObserver` | função e tipos | Observador OpenTelemetry. | `packages/observability/src/index.ts:22-23` |
| `LifecycleObserver`, `HttpBatchOptions` | tipos | Contrato do observador de ciclo de vida e opções de lote HTTP. | `packages/observability/src/index.ts:25` |
| `createTraceTracker`, `TraceSpan`, `TraceTrackerCallbacks` | função e tipos | Rastreia spans de uma execução. | `packages/observability/src/index.ts:27-28` |
| `costGuard`, `priceFor`, `computeCost`, `DEFAULT_PRICES`, `CostGuardOptions`, `TokenPrice`, `CostGuardErrorHandler`, `UnknownModelPolicy` | função, constante e tipos | Controle de custo por modelo, com preços e política para modelo desconhecido. | `packages/observability/src/index.ts:30-31` |
| `createInMemoryCostStore`, `recordCostSpend`, `monthlyWindowKey`, `CostReservationError`, e tipos `CostStore`, `CostWindow`, `CostReserveInput`, `CostSpendRecord`, `InMemoryCostStore` e outros | função, erro e tipos | Armazenamento de custo com reserva e janela mensal. | `packages/observability/src/index.ts:33-47` |
| `CostGuardStoreOptions` | tipo | Opções do guard com armazenamento. | `packages/observability/src/index.ts:48` |
| `multiTenantCostGuard`, `MultiTenantCostGuardOptions` | função e tipo | Controle de custo por tenant. | `packages/observability/src/index.ts:49-50` |
| `createAdvancedCostGuard`, `consoleAlertSink`, `webhookAlertSink`, `throttle`, e tipos `CostCaps`, `CostAlertEvent`, `CostGuardMode` e outros | funções e tipos | Controle de custo com limites por janela, alertas e modo (`warn`, `reject`, `kill`). | `packages/observability/src/index.ts:51-68` |
| `chargebackReport`, `chargebackReportToCsv`, e tipos | funções e tipos | Relatório de chargeback de custo, com exportação CSV. | `packages/observability/src/index.ts:69-80` |
| `approximateCounter`, `countTokens`, `countTokensDetailed`, `createProviderCounter`, `ProviderTokenCounterOptions` | funções e tipo | Contagem de tokens, aproximada ou por provedor. | `packages/observability/src/index.ts:82-83` |
| `buildTraceReport`, `renderTraceViewerHtml`, `createFileTraceSink`, `TraceReport`, `FileTraceSink` | funções e tipos | Relatório e visualizador HTML de traces. | `packages/observability/src/index.ts:84-90` |
| `appendPiiAuditEvents`, `createSignedAuditLog`, `createInMemoryAuditStore`, e tipos | funções e tipos | Log de auditoria assinado e registro de eventos de PII. | `packages/observability/src/index.ts:91-107` |
| `sloObserver`, `DEFAULT_SLO_TARGETS`, e tipos | função, constante e tipos | Observador de SLO. | `packages/observability/src/index.ts:109-110` |
| `createTopologyGraph`, e tipos | função e tipos | Grafo de topologia de execução. | `packages/observability/src/index.ts:112-120` |
| `createControlSurface`, e tipos | função e tipos | Superfície de controle de produção (overrides de ferramenta, snapshots de execução). | `packages/observability/src/index.ts:122-129` |
| `createDevtoolsServer`, `toSseFrame`, e tipos | funções e tipos | Servidor de devtools com envelopes SSE. | `packages/observability/src/index.ts:131-137` |
| `replayEvents`, `replayBisect`, `buildTimeline`, `diffState`, `positionAt`, e tipos | funções e tipos | Replay de eventos, bisseção de regressão e linha do tempo com diferenças de estado. | `packages/observability/src/index.ts:142-153` |

Subpath separado, com exports próprios: `./cost-store-contract` (`packages/observability/package.json:50-53`), que expõe `costStoreContract` (`packages/observability/src/cost-store-contract.ts:51`). É a forma de testar uma implementação própria de `CostStore`.

Exemplo real de import, em teste de integração com PostgreSQL:

```ts
import { costStoreContract, type CostStoreContractResult } from '@agentskit/observability/cost-store-contract'
```

Fonte: `packages/observability/tests/postgres-contract.ts:3`. O README usa o mesmo subpath (`packages/observability/README.md:238`).

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] e [[agentskit-net]] (`packages/observability/package.json:79-80`); [[agentskit-cross-platform]] (`packages/observability/package.json:118`) |
| Consumidores no monorepo | `@agentskit/observability-langfuse` (`packages/observability-langfuse/package.json:45`); `apps/docs-next` (`apps/docs-next/package.json:42`); `package.json` da raiz do monorepo (`package.json:90`). |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/observability.mdx` (`.doc-bridge/index.json`, `handoffs.observability`) |

## Dados e efeitos

- Nenhuma leitura direta de variável de ambiente em `packages/observability/src`. Os únicos nomes que aparecem são em comentários de documentação (`packages/observability/src/langsmith.ts:53`, `LANGSMITH_API_KEY`) e em testes: `AK_POSTGRES_TEST_PORT` (`packages/observability/tests/postgres.integration.test.ts:3`, `tests/cjs-smoke.cjs:13`). O README usa `ANTHROPIC_API_KEY` só no exemplo de adapter (`packages/observability/README.md:57`).
- Rede: os sinks HTTP (Datadog, Axiom, New Relic, lote HTTP) enviam eventos a serviços externos; o `CONVENTIONS.md` exige que falhas nesses envios não escapem do observador (`packages/observability/CONVENTIONS.md:27`, `:43`).
- Armazenamento: `CostStore` tem implementação em memória (`createInMemoryCostStore`); a implementação durável com PostgreSQL foi adicionada no commit `ccbb1e6d` e é testada por `tests/postgres.test.ts` e `tests/postgres.integration.test.ts`, que só rodam com `AK_POSTGRES_TEST_PORT` definido.
- Alertas de custo: `webhookAlertSink` envia alertas por webhook (ver `createAdvancedCostGuard`).

## Como mexer (para agentes)

- **Comece por:** `packages/observability/CONVENTIONS.md`, `packages/observability/src/index.ts` e `packages/observability/src/cost-store-contract.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/observability.mdx`.
- **Raiz de edição do handoff:** `packages/observability` (`.doc-bridge/index.json`, `handoffs.observability`).
- **Invariantes:**
  - Falhas saem só pela opção `onError`: throws síncronos e rejeições assíncronas de callbacks, sinks, chamadas de SDK e resolvers não podem escapar de `observer.on` nem gerar `unhandledRejection` (`packages/observability/CONVENTIONS.md:27`).
  - SDKs opcionais (LangSmith, OpenTelemetry, Langfuse) são resolvidos de forma preguiçosa; o pacote é dono do flush e do shutdown apenas dos SDKs que ele constrói (`packages/observability/CONVENTIONS.md:28`).
  - Modos de custo: `warn` apenas observa; `reject` define um flag que o host precisa consultar com `isRejected(tenant)`; `kill` usa `disableRuntime` e `isDisabled` e falha fechado (`packages/observability/CONVENTIONS.md:35`).
  - Nunca lançar a partir de um observador (`packages/observability/CONVENTIONS.md:43`).
- **Testes:** `tests/observers.test.ts`, `tests/sinks-batch.test.ts`, `tests/langsmith.test.ts`, `tests/opentelemetry.test.ts` e `tests/redaction.test.ts` (observadores); `tests/cost-guard*.test.ts`, `tests/cost-store*.test.ts` e `tests/cost-chargeback.test.ts` (custo); `tests/audit-log.test.ts`; `tests/slo.test.ts`; `tests/replay*.test.ts` e `tests/topology-graph.test.ts`; `tests/devtools.test.ts` e `tests/prod-control.test.ts`; `tests/cjs-smoke.cjs` (interoperabilidade CommonJS); e `tests/package-manifest.test.ts`.
- **Validação:** `pnpm --filter @agentskit/observability test` (executa `vitest run`, `packages/observability/package.json:70`) e `pnpm --filter @agentskit/observability lint` (`tsc --noEmit`, `packages/observability/package.json:72`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Checklist de revisão do pacote:** bundle dentro do orçamento de 16,5 KB gzip em `.size-limit.json` (`packages/observability/CONVENTIONS.md:74`).
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados: [[agentskit ADR-0001 - Contrato de adapter]], [[agentskit ADR-0006 - Contrato de runtime]] e [[agentskit ADR-0009 - Regras de composição e dependência]] (citados nas fontes). Pelo título, também relevantes e não verificados no corpo: [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]], [[agentskit ADR-0037 - Um pacote cuida da infraestrutura HTTP]] e [[agentskit ADR-0044 - Armazenamento durável de custo por tenant]]. Histórico recente (`git log --oneline -8 -- packages/observability`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `ccbb1e6d feat(observability): durable tenant CostStore with Postgres backend (#1835)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `218c5ade fix(observability): use UUID devtools server IDs (#1747)`

> [!info]- Detalhe técnico
> - `packages/observability/package.json:1` — manifesto, dependências (`:79-80`, `:118`), subpaths (`:50-53`) e scripts (`:70`, `:72`).
> - `packages/observability/src/index.ts:1` — entrada pública, com 153 linhas de exports.
> - `packages/observability/src/cost-store-contract.ts:51` — `costStoreContract`.
> - `packages/observability/CONVENTIONS.md:27` — invariantes de erro, SDK e custo.
> - `packages/observability/tests/postgres-contract.ts:3` — exemplo de import do subpath.
