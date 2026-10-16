---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/observability"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/observability/package.json", "packages/observability/src/index.ts", "apps/docs-next/content/docs/for-agents/observability.mdx", "AGENTS.md", "packages/observability/CONVENTIONS.md", "packages/observability/tests/audit-log.test.ts", "packages/observability/tests/cjs-smoke.cjs", "packages/observability/tests/console-logger.test.ts", "packages/observability/tests/cost-chargeback.test.ts", "docs/architecture/adrs/0001-adapter-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-observability

> [!tldr] Em linguagem comum
> Pacote observability do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

O pacote `@agentskit/observability` publica a superfície definida em `packages/observability/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/observability.mdx` e limita edições a `packages/observability`. Fonte: `packages/observability/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.observability`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `consoleLogger` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:1` |
| `ConsoleLoggerConfig` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:2` |
| `wrapObserverWithRedaction` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:4` |
| `{` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:5` |
| `langsmith` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:10` |
| `LangSmithConfig` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:11` |
| `LangSmithObserver` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:11` |
| `datadogSink` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:13` |
| `DatadogSinkConfig` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:14` |
| `DatadogSinkObserver` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:14` |
| `axiomSink` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:16` |
| `AxiomSinkConfig` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:17` |
| `AxiomSinkObserver` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:17` |
| `newRelicSink` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:19` |
| `NewRelicSinkConfig` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:20` |
| `NewRelicSinkObserver` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:20` |
| `opentelemetry` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:22` |
| `OpenTelemetryConfig` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:23` |
| `OpenTelemetryObserver` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:23` |
| `LifecycleObserver` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:25` |
| `HttpBatchOptions` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:25` |
| `createTraceTracker` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:27` |
| `TraceSpan` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:28` |
| `TraceTrackerCallbacks` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:28` |
| `costGuard` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:30` |
| `priceFor` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:30` |
| `computeCost` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:30` |
| `DEFAULT_PRICES` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:30` |
| `CostGuardOptions` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:31` |
| `TokenPrice` | export nomeado | API pública do pacote. | `packages/observability/src/index.ts:31` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { costStoreContract, type CostStoreContractResult } from '@agentskit/observability/cost-store-contract'` — `packages/observability/tests/postgres-contract.ts:3`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-net]] (`packages/observability/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/observability.mdx` (`.doc-bridge/index.json`, `handoffs.observability`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: AK_POSTGRES_TEST_PORT, ANTHROPIC_API_KEY, LANGSMITH_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/observability.mdx`, `packages/observability/CONVENTIONS.md` e `packages/observability/src/index.ts`.
- **Raiz de edição do handoff:** `packages/observability` (`.doc-bridge/index.json`, `handoffs.observability`).
- **Invariantes:** Failures surface through optional `onError` only. Sync throws and async rejections from callbacks, sinks, SDK calls, and resolvers must not escape `observer.on` or produce `unhandledRejection`. (`packages/observability/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/observability/tests/audit-log.test.ts`, `packages/observability/tests/cjs-smoke.cjs`, `packages/observability/tests/console-logger.test.ts`, `packages/observability/tests/cost-chargeback.test.ts`, `packages/observability/tests/cost-guard-advanced-internal.test.ts`, `packages/observability/tests/cost-guard-advanced-types.test.ts`, `packages/observability/tests/cost-guard-advanced.test.ts`, `packages/observability/tests/cost-guard-alert-sinks.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/observability test` e `pnpm --filter @agentskit/observability lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0001 - Adapter Contract]], [[agentskit ADR-0006 - Runtime Contract]], [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0012 - Vendor adapter scope & granularity]], [[agentskit ADR-0022 - Consolidate vendor adapters into owning packages]], [[agentskit ADR-0031 - Shared CLI adapter execution boundary]], [[agentskit ADR-0037 - One package owns HTTP plumbing]], [[agentskit ADR-0044 - Durable tenant cost store]]. Histórico recente (`git log --oneline -15 -- packages/observability`):

- `e8d42064 chore: version packages (#1757)`
- `ccbb1e6d feat(observability): durable tenant CostStore with Postgres backend (#1835)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `218c5ade fix(observability): use UUID devtools server IDs (#1747)`

> [!info]- Detalhe técnico
> - `packages/observability/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/observability/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/observability.mdx:1` — handoff documental de agentes.
> - `packages/observability/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
