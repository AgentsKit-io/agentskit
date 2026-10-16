---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/eval-braintrust"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/eval-braintrust/package.json", "packages/eval-braintrust/src/index.ts", "packages/eval-braintrust/src/runner.ts", "packages/eval-braintrust/src/scorers/index.ts", "packages/eval-braintrust/src/ci.ts", "apps/docs-next/content/docs/for-agents/eval-braintrust.mdx", "AGENTS.md", "packages/eval-braintrust/CONVENTIONS.md", "packages/eval-braintrust/tests/ci.test.ts", "packages/eval-braintrust/tests/runner.test.ts", "packages/eval-braintrust/tests/scorers.test.ts", "docs/architecture/adrs/0012-vendor-adapter-scope.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-eval-braintrust

> [!tldr] Em linguagem comum
> Pontuação de agentes com a plataforma Braintrust: funções de avaliação (scorers) puras que medem qualidade e robustez de cada caso, um runner que envia o experimento e um detector de regressões para CI.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

Integração de avaliação com Braintrust. Os scorers são funções puras: não fazem chamadas de rede e recebem tudo por `ScorerInput` (`packages/eval-braintrust/CONVENTIONS.md:18`). O runner (`runBraintrustEval`) executa a avaliação e devolve um `ExperimentResult`; `detectRegressions` compara resultados com limiares e `formatAlertsMarkdown` formata os alertas para CI (`packages/eval-braintrust/src/index.ts:29-30`). O pacote depende de `@agentskit/core` (`packages/eval-braintrust/package.json:54`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx` e limita edições a `packages/eval-braintrust` (`.doc-bridge/index.json`, `handoffs.eval-braintrust`).

## API e contratos

Exports de `packages/eval-braintrust/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `Scorer`, `ScorerInput`, `ScorerResult`, `ScorerFamily` | tipos | Contrato de um scorer, sua entrada, seu resultado e sua família. | `packages/eval-braintrust/src/index.ts:1` |
| `scoreCase`, `summarize`, `runBraintrustEval` | funções | Pontua um caso, resume resultados e executa a avaliação no Braintrust. | `packages/eval-braintrust/src/index.ts:3-7` |
| `BraintrustRunOptions`, `ScoredCase`, `ExperimentResult`, `RunBraintrustEvalArgs` | tipos | Opções da execução, caso pontuado, resultado do experimento e argumentos. | `packages/eval-braintrust/src/index.ts:8-13` |
| `qualityFamily`, `robustnessFamily`, `ALL_SCORERS` | scorers | Famílias de qualidade e robustez, e a lista completa. | `packages/eval-braintrust/src/index.ts:15-27` |
| `taskSuccess`, `factualGrounding`, `citationCorrectness`, `toolArgValidity`, `schemaSurvival`, `hitlGateCorrectness`, `fallbackResilience`, `noCrashSurvival` | scorers | Scorers individuais, cada um medindo um aspecto do caso. | `packages/eval-braintrust/src/index.ts:19-26` |
| `detectRegressions`, `formatAlertsMarkdown` | CI | Detecta regressões contra limiares e formata alertas em Markdown. | `packages/eval-braintrust/src/index.ts:29` |
| `RegressionThresholds`, `RegressionAlert` | tipos | Limiares e formato do alerta de regressão. | `packages/eval-braintrust/src/index.ts:30` |

Exemplo real de uso, em teste do runner:

```ts
import { taskSuccess, schemaSurvival } from '../src/scorers'
```

Fonte: `packages/eval-braintrust/tests/runner.test.ts:3`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/eval-braintrust/package.json:54`, `"@agentskit/core": "workspace:*"`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/eval-braintrust`. |
| Relação com `@agentskit/eval` | `@agentskit/eval` expõe o subpath `./braintrust` (`packages/eval/package.json:72`). Não verificado se esse subpath reexporta este pacote; ver [[Dúvidas abertas]]. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx` (`.doc-bridge/index.json`, `handoffs.eval-braintrust`) |

## Dados e efeitos

- Variáveis de ambiente lidas por `envOr` em `packages/eval-braintrust/src/runner.ts:53-54`, com os nomes:
  - `BRAINTRUST_API_KEY`: chave de API do Braintrust, quando a opção `apiKey` não é passada (`packages/eval-braintrust/src/runner.ts:238`).
  - `BRAINTRUST_BASE_URL`: URL base do Braintrust, quando `baseUrl` não é passada (`packages/eval-braintrust/src/runner.ts:239`).
- Rede: o runner envia o experimento ao Braintrust (`runBraintrustEval`). Os scorers não fazem chamada de rede (`packages/eval-braintrust/CONVENTIONS.md:18`).
- Permissões ou capabilities: nenhuma além da chave do Braintrust.

## Como mexer (para agentes)

- **Comece por:** `packages/eval-braintrust/CONVENTIONS.md`, `packages/eval-braintrust/src/index.ts` e `packages/eval-braintrust/src/scorers/index.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx`.
- **Raiz de edição do handoff:** `packages/eval-braintrust` (`.doc-bridge/index.json`, `handoffs.eval-braintrust`).
- **Invariantes:**
  - Scorers são puros: sem chamada de rede dentro do scorer; tudo que ele precisa vem de `ScorerInput` (`packages/eval-braintrust/CONVENTIONS.md:18`).
  - Chamar modelo de dentro de um scorer é armadilha: use um agente wrapper (`packages/eval-braintrust/CONVENTIONS.md:41`).
  - Cobertura de linhas igual ou acima de 95% (`packages/eval-braintrust/CONVENTIONS.md:35`).
- **Testes:** `packages/eval-braintrust/tests/scorers.test.ts` (scorers), `tests/runner.test.ts` (runner e resumo) e `tests/ci.test.ts` (regressões e alertas).
- **Validação:** `pnpm --filter @agentskit/eval-braintrust test` (executa `vitest run`, `packages/eval-braintrust/package.json:48`) e `pnpm --filter @agentskit/eval-braintrust lint` (`tsc --noEmit`, `packages/eval-braintrust/package.json:50`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados pelo documento citado na fonte: [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]]. Histórico recente (`git log --oneline -8 -- packages/eval-braintrust`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/eval-braintrust/package.json:1` — manifesto, dependência (`:54`) e scripts (`:48`, `:50`).
> - `packages/eval-braintrust/src/index.ts:1` — entrada pública (tipos, runner, scorers e CI).
> - `packages/eval-braintrust/src/runner.ts:53` — leitura de variáveis de ambiente por `envOr`.
> - `packages/eval-braintrust/CONVENTIONS.md:18` — invariante de scorers puros.
