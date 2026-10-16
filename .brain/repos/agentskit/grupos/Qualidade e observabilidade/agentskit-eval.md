---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/eval"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/eval/package.json", "packages/eval/src/index.ts", "packages/eval/src/ci/index.ts", "packages/eval/src/snapshot/snapshot.ts", "packages/eval/README.md", "apps/docs-next/content/docs/for-agents/eval.mdx", "AGENTS.md", "packages/eval/CONVENTIONS.md", "packages/eval/tests/against.test.ts", "packages/eval/tests/bundler-interop.mjs", "packages/eval/tests/bundler-interop.test.ts", "packages/eval/tests/ci.test.ts", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0004-retriever-contract.md", "docs/architecture/adrs/0005-skill-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-eval

> [!tldr] Em linguagem comum
> Avaliação de agentes como teste: roda um conjunto de casos (`runEval`), grava e reproduz execuções gravadas (replay), compara com um snapshot anterior e gera relatórios para CI. Não é um runner de testes; o consumidor usa `vitest` ou similar.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

Avaliação e benchmark de agentes. Escopo declarado: `runEval({ agent, suite })`, que executa um `EvalSuite` em sequência e devolve um `EvalResult`; gravação determinística de cassetes, replay e comparação com replay; registros de resultado portáteis com hash canônico e verificação de integridade; snapshot de prompt, diff e relatórios (JUnit, Markdown, GitHub Actions); e pontuação de qualidade e robustez com Braintrust como peer opcional (`packages/eval/CONVENTIONS.md:9-16`). Estabilidade declarada: `beta`; `runEval` é o núcleo estável (`packages/eval/CONVENTIONS.md:5-7`). Dependências: `@agentskit/core` e `@agentskit/cross-platform` (`packages/eval/package.json:110-111`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/eval.mdx` e limita edições a `packages/eval` (`.doc-bridge/index.json`, `handoffs.eval`).

## API e contratos

Exports da entrada principal, `packages/eval/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `runEval` | função | Executa uma suíte de casos contra um agente e devolve `EvalResult`. | `packages/eval/src/index.ts:1` |
| `AgentFn`, `AgentResponse`, `RunEvalConfig` | tipos | Função do agente, resposta do agente e configuração de `runEval`. | `packages/eval/src/index.ts:2` |
| `EvalSuite`, `EvalResult` | tipos | Definição da suíte e resultado da execução. | `packages/eval/src/index.ts:3` |

Além da entrada principal, o manifesto expõe subpaths com seus próprios exports (`packages/eval/package.json:37-90`):

| Subpath | Para que serve | Onde |
|---|---|---|
| `./replay` | Gravação e replay de cassetes; versão de browser em `replay.browser`. | `packages/eval/package.json:37-50` |
| `./replay/io` | Salvar e carregar cassetes em disco (usa APIs de Node). | `packages/eval/package.json:52-56` |
| `./snapshot` | Snapshot de prompt (usa APIs de Node). | `packages/eval/package.json:57-61` |
| `./diff` | Diferenças entre execuções. | `packages/eval/package.json:62-66` |
| `./ci` | Relatórios e anotações para CI (usa APIs de Node). | `packages/eval/package.json:67-71` |
| `./braintrust`, `./braintrust/scorers`, `./braintrust/ci` | Integração com Braintrust. | `packages/eval/package.json:72-86` |
| `./provenance` | Registros de resultado portáteis com hash e verificação. | `packages/eval/package.json:87-91` |

Exemplo real de import de subpath, usado no teste de interoperabilidade de bundlers (texto de um arquivo gerado no teste):

```ts
import { createResultRecord, serializeResultRecord, verifyResultRecord } from '@agentskit/eval/provenance'
```

Fonte: `packages/eval/tests/bundler-interop.mjs:33`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] (`packages/eval/package.json:110`), [[agentskit-cross-platform]] (`packages/eval/package.json:111`) |
| Consumidores no monorepo | `apps/docs-next` (`apps/docs-next/package.json:39`), `apps/example-dspy` (`apps/example-dspy/package.json:14`) e o `package.json` da raiz (`package.json:89`) declaram `"@agentskit/eval": "workspace:*"`. |
| Consumidores externos | Não confirmado. |
| Peer opcional | Braintrust, pela integração `./braintrust` (`packages/eval/CONVENTIONS.md:15`). |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/eval.mdx` (`.doc-bridge/index.json`, `handoffs.eval`) |

## Dados e efeitos

- Variáveis de ambiente lidas em `packages/eval/src`:
  - `GITHUB_ACTIONS`: liga anotações do GitHub por padrão (`packages/eval/src/ci/index.ts:53`).
  - `GITHUB_STEP_SUMMARY`: caminho do arquivo de resumo do passo; se definido, o relatório Markdown é anexado a ele (`packages/eval/src/ci/index.ts:54` e `:90-91`).
  - `UPDATE_SNAPSHOTS`: quando `'1'`, atualiza os snapshots de prompt (`packages/eval/src/snapshot/snapshot.ts:204`).
- `ANTHROPIC_API_KEY` aparece só nos exemplos de README e fixture (`packages/eval/README.md:58`; `packages/eval/fixtures/readme-quickstart.ts:6`); o pacote não lê essa variável.
- Efeitos de arquivo: os subpaths `replay/io`, `snapshot` e `ci` usam o sistema de arquivos e o processo de Node (`packages/eval/CONVENTIONS.md:24`).
- Rede: não há chamada de rede no núcleo; a integração com Braintrust fica no subpath próprio.

## Como mexer (para agentes)

- **Comece por:** `packages/eval/CONVENTIONS.md`, `packages/eval/src/index.ts` e `packages/eval/package.json` (subpaths). O handoff do índice também cita `apps/docs-next/content/docs/for-agents/eval.mdx`.
- **Raiz de edição do handoff:** `packages/eval` (`.doc-bridge/index.json`, `handoffs.eval`).
- **Invariantes:**
  - A entrada de avaliação é somente leitura; executores e helpers de replay copiam dados mutáveis nas fronteiras (`packages/eval/CONVENTIONS.md:21`).
  - Saída malformada do agente vira caso falho, sem abortar a suíte (`packages/eval/CONVENTIONS.md:22`).
  - Os subpaths `replay/io`, `snapshot` e `ci` são as fronteiras com Node; o entry de browser e React Native não pode importar módulos built-in de Node (`packages/eval/CONVENTIONS.md:24`, `:30`).
  - Para ampliar a superfície pública, estender um subpath existente quando possível (`packages/eval/CONVENTIONS.md:29`).
- **Testes:** `packages/eval/tests/runner.test.ts` (execução), `tests/replay.test.ts` e `tests/time-travel.test.ts` (replay), `tests/result-record.test.ts` (registros de proveniência), `tests/snapshot.test.ts` (snapshot), `tests/diff.test.ts`, `tests/clone.test.ts`, `tests/ci.test.ts`, `tests/against.test.ts` e `tests/bundler-interop.test.ts` (interoperabilidade ESM/CJS, `test:interop`).
- **Validação:** `pnpm --filter @agentskit/eval test` (executa `pnpm test:prepare && vitest run`, `packages/eval/package.json:102`) e `pnpm --filter @agentskit/eval lint` (`tsc --noEmit`, `packages/eval/package.json:106`). Interoperabilidade: `test:interop` (`packages/eval/package.json:104`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Checklist de revisão do pacote:** bundle abaixo de 10 KB gzip (`packages/eval/CONVENTIONS.md:50`).
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados pelos documentos citados na fonte: [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]]. Pelo título, também relevante (não verificado no corpo do ADR): [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]]. Histórico recente (`git log --oneline -8 -- packages/eval`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `cff4ba9b feat(eval): add hashed result provenance records (#1834)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`

> [!info]- Detalhe técnico
> - `packages/eval/package.json:1` — manifesto, subpaths (`:37-91`), dependências (`:110-111`) e scripts (`:102`, `:104`, `:106`).
> - `packages/eval/src/index.ts:1` — entrada principal.
> - `packages/eval/src/ci/index.ts:53` — leitura de `GITHUB_ACTIONS` e `GITHUB_STEP_SUMMARY`.
> - `packages/eval/src/snapshot/snapshot.ts:204` — leitura de `UPDATE_SNAPSHOTS`.
> - `packages/eval/CONVENTIONS.md:21` — princípios e fronteiras de host.
