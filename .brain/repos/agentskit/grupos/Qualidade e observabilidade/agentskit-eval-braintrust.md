---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/eval-braintrust"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/eval-braintrust/package.json", "packages/eval-braintrust/src/index.ts", "apps/docs-next/content/docs/for-agents/eval-braintrust.mdx", "AGENTS.md", "packages/eval-braintrust/CONVENTIONS.md", "packages/eval-braintrust/tests/ci.test.ts", "packages/eval-braintrust/tests/runner.test.ts", "packages/eval-braintrust/tests/scorers.test.ts", "docs/architecture/adrs/0012-vendor-adapter-scope.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-eval-braintrust

> [!tldr] Em linguagem comum
> Pacote eval-braintrust do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

O pacote `@agentskit/eval-braintrust` publica a superfície definida em `packages/eval-braintrust/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx` e limita edições a `packages/eval-braintrust`. Fonte: `packages/eval-braintrust/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.eval-braintrust`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `Scorer` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:1` |
| `ScorerInput` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:1` |
| `ScorerResult` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:1` |
| `ScorerFamily` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:1` |
| `{` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:8` |
| `detectRegressions` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:29` |
| `formatAlertsMarkdown` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:29` |
| `RegressionThresholds` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:30` |
| `RegressionAlert` | export nomeado | API pública do pacote. | `packages/eval-braintrust/src/index.ts:30` |

Exemplo de uso localizado em documentação ou teste:

> [!question] Dúvida
> Não foi localizada importação de consumidor do pacote em testes/documentação amostrados. O exemplo de chamada da API exige leitura adicional do teste funcional correspondente.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/eval-braintrust/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx` (`.doc-bridge/index.json`, `handoffs.eval-braintrust`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: GITHUB_PR_NUMBER. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx`, `packages/eval-braintrust/CONVENTIONS.md` e `packages/eval-braintrust/src/index.ts`.
- **Raiz de edição do handoff:** `packages/eval-braintrust` (`.doc-bridge/index.json`, `handoffs.eval-braintrust`).
- **Invariantes:** **Scorers are pure.** No network calls inside a scorer. Every input the scorer needs comes through `ScorerInput`. (`packages/eval-braintrust/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/eval-braintrust/tests/ci.test.ts`, `packages/eval-braintrust/tests/runner.test.ts`, `packages/eval-braintrust/tests/scorers.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/eval-braintrust test` e `pnpm --filter @agentskit/eval-braintrust lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0012 - Vendor adapter scope & granularity]]. Histórico recente (`git log --oneline -15 -- packages/eval-braintrust`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/eval-braintrust/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/eval-braintrust/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/eval-braintrust.mdx:1` — handoff documental de agentes.
> - `packages/eval-braintrust/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
