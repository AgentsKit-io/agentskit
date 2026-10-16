---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/statechart"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/statechart/package.json", "packages/statechart/src/index.ts", "apps/docs-next/content/docs/for-agents/statechart.mdx", "AGENTS.md", "packages/statechart/CONVENTIONS.md", "packages/statechart/tests/json.test.ts", "packages/statechart/tests/package-manifest.test.ts", "packages/statechart/tests/snapshot.test.ts", "packages/statechart/tests/statechart.test.ts", "docs/architecture/adrs/0020-serializable-interaction-state.md", "docs/architecture/adrs/0027-statechart-beta-boundaries.md", "docs/architecture/adrs/README.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-statechart

> [!tldr] Em linguagem comum
> Pacote statechart do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/statechart` publica a superfície definida em `packages/statechart/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/statechart.mdx` e limita edições a `packages/statechart`. Fonte: `packages/statechart/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.statechart`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `defineStatechart` | export nomeado | API pública do pacote. | `packages/statechart/src/index.ts:7` |
| `restoreStatechart` | export nomeado | API pública do pacote. | `packages/statechart/src/index.ts:9` |
| `serializeStatechart` | export nomeado | API pública do pacote. | `packages/statechart/src/index.ts:9` |
| `{` | export nomeado | API pública do pacote. | `packages/statechart/src/index.ts:17` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { createStatechartInstance, defineStatechart } from '@agentskit/statechart'` — `packages/statechart/README.md:130`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | Nenhuma dependência interna declarada no manifesto. (`packages/statechart/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/statechart.mdx` (`.doc-bridge/index.json`, `handoffs.statechart`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/statechart.mdx`, `packages/statechart/CONVENTIONS.md` e `packages/statechart/src/index.ts`.
- **Raiz de edição do handoff:** `packages/statechart` (`.doc-bridge/index.json`, `handoffs.statechart`).
- **Invariantes:** Definition maps must preserve valid hostile keys such as `__proto__` without prototype mutation. (`packages/statechart/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/statechart/tests/json.test.ts`, `packages/statechart/tests/package-manifest.test.ts`, `packages/statechart/tests/snapshot.test.ts`, `packages/statechart/tests/statechart.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/statechart test` e `pnpm --filter @agentskit/statechart lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0020 - Serializable interaction state]], [[agentskit ADR-0027 - Statechart beta safety boundaries]]. Histórico recente (`git log --oneline -15 -- packages/statechart`):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `a059cffd docs(statechart): document public API (#1779)`
- `08fce242 chore: retire public AKOS references (#1615)`
- `9266a6da chore(deps): refresh minor and patch versions`
- `e76c66e9 fix(release): normalize repository metadata for npm OIDC (#1522)`
- `86c3c646 chore: version packages and refresh changelogs (#1519)`
- `e96ebe62 fix(runtime): harden replay and lifecycle contracts (#1506)`

> [!info]- Detalhe técnico
> - `packages/statechart/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/statechart/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/statechart.mdx:1` — handoff documental de agentes.
> - `packages/statechart/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
