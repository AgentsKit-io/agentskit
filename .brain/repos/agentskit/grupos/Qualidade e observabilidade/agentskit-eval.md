---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/eval"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/eval/package.json", "packages/eval/src/index.ts", "apps/docs-next/content/docs/for-agents/eval.mdx", "AGENTS.md", "packages/eval/CONVENTIONS.md", "packages/eval/tests/against.test.ts", "packages/eval/tests/bundler-interop.mjs", "packages/eval/tests/bundler-interop.test.ts", "packages/eval/tests/ci.test.ts", "docs/architecture/adrs/0003-memory-contract.md", "docs/architecture/adrs/0004-retriever-contract.md", "docs/architecture/adrs/0005-skill-contract.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-eval

> [!tldr] Em linguagem comum
> Pacote eval do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

O pacote `@agentskit/eval` publica a superfície definida em `packages/eval/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/eval.mdx` e limita edições a `packages/eval`. Fonte: `packages/eval/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.eval`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `runEval` | export nomeado | API pública do pacote. | `packages/eval/src/index.ts:1` |
| `AgentFn` | export nomeado | API pública do pacote. | `packages/eval/src/index.ts:2` |
| `AgentResponse` | export nomeado | API pública do pacote. | `packages/eval/src/index.ts:2` |
| `RunEvalConfig` | export nomeado | API pública do pacote. | `packages/eval/src/index.ts:2` |
| `EvalSuite` | export nomeado | API pública do pacote. | `packages/eval/src/index.ts:3` |
| `EvalResult` | export nomeado | API pública do pacote. | `packages/eval/src/index.ts:3` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `"import { createResultRecord, serializeResultRecord, verifyResultRecord } from '@agentskit/eval/provenance'",` — `packages/eval/tests/bundler-interop.mjs:33`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-cross-platform]] (`packages/eval/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/eval.mdx` (`.doc-bridge/index.json`, `handoffs.eval`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: ANTHROPIC_API_KEY, GITHUB_STEP_SUMMARY, UPDATE_SNAPSHOTS. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/eval.mdx`, `packages/eval/CONVENTIONS.md` e `packages/eval/src/index.ts`.
- **Raiz de edição do handoff:** `packages/eval` (`.doc-bridge/index.json`, `handoffs.eval`).
- **Invariantes:** [ ] Bundle size under 10KB gzipped (`packages/eval/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/eval/tests/against.test.ts`, `packages/eval/tests/bundler-interop.mjs`, `packages/eval/tests/bundler-interop.test.ts`, `packages/eval/tests/ci.test.ts`, `packages/eval/tests/clone.test.ts`, `packages/eval/tests/diff.test.ts`, `packages/eval/tests/replay.test.ts`, `packages/eval/tests/result-record.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/eval test` e `pnpm --filter @agentskit/eval lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0003 - Contrato de memória]], [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0006 - Contrato de runtime]], [[agentskit ADR-0007 - Plataforma de documentação Fumadocs]], [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]], [[agentskit ADR-0022 - Adapters de fornecedor consolidados nos pacotes donos]], [[agentskit ADR-0034 - Shell do ecossistema v1]], [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]], [[agentskit ADR-0038 - Utilitários de JSON canônico e SHA-256]], [[agentskit ADR-0040 - Compatibilidade da impressão digital de replay de eval]], [[agentskit ADR-0042 - Decisões duráveis de ferramenta no core 1.x]], [[agentskit ADR-0043 - Composição de RAG vinculada a partição]]. Histórico recente (`git log --oneline -15 -- packages/eval`):

- `e8d42064 chore: version packages (#1757)`
- `cff4ba9b feat(eval): add hashed result provenance records (#1834)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `c4f5a758 refactor: use core isRecord guard in five packages (#1768)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`

> [!info]- Detalhe técnico
> - `packages/eval/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/eval/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/eval.mdx:1` — handoff documental de agentes.
> - `packages/eval/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
