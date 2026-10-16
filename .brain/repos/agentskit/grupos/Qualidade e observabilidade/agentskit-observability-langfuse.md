---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/observability-langfuse"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/observability-langfuse/package.json", "packages/observability-langfuse/src/index.ts", "apps/docs-next/content/docs/for-agents/observability-langfuse.mdx", "AGENTS.md", "packages/observability-langfuse/CONVENTIONS.md", "packages/observability-langfuse/tests/langfuse-missing.test.ts", "packages/observability-langfuse/tests/langfuse-snapshot.test.ts", "packages/observability-langfuse/tests/langfuse-types.test.ts", "packages/observability-langfuse/tests/langfuse.test.ts", "docs/architecture/adrs/0012-vendor-adapter-scope.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-observability-langfuse

> [!tldr] Em linguagem comum
> Pacote observability-langfuse do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

O pacote `@agentskit/observability-langfuse` publica a superfície definida em `packages/observability-langfuse/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx` e limita edições a `packages/observability-langfuse`. Fonte: `packages/observability-langfuse/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.observability-langfuse`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `langfuse` | export nomeado | API pública do pacote. | `packages/observability-langfuse/src/index.ts:1` |
| `LangfuseConfig` | export nomeado | API pública do pacote. | `packages/observability-langfuse/src/index.ts:2` |
| `LangfuseObserver` | export nomeado | API pública do pacote. | `packages/observability-langfuse/src/index.ts:2` |

Exemplo de uso localizado em documentação ou teste:

> [!question] Dúvida
> Não foi localizada importação de consumidor do pacote em testes/documentação amostrados. O exemplo de chamada da API exige leitura adicional do teste funcional correspondente.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-observability]] (`packages/observability-langfuse/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx` (`.doc-bridge/index.json`, `handoffs.observability-langfuse`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: AK_LANGFUSE_TEST_KEY, LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx`, `packages/observability-langfuse/CONVENTIONS.md` e `packages/observability-langfuse/src/index.ts`.
- **Raiz de edição do handoff:** `packages/observability-langfuse` (`.doc-bridge/index.json`, `handoffs.observability-langfuse`).
- **Invariantes:** Siga os limites de responsabilidade e compatibilidade descritos em CONVENTIONS.md. (`packages/observability-langfuse/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/observability-langfuse/tests/langfuse-missing.test.ts`, `packages/observability-langfuse/tests/langfuse-snapshot.test.ts`, `packages/observability-langfuse/tests/langfuse-types.test.ts`, `packages/observability-langfuse/tests/langfuse.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/observability-langfuse test` e `pnpm --filter @agentskit/observability-langfuse lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]]. Histórico recente (`git log --oneline -15 -- packages/observability-langfuse`):

- `e8d42064 chore: version packages (#1757)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`
- `9226c833 chore: version packages (#1618)`
- `08fce242 chore: retire public AKOS references (#1615)`

> [!info]- Detalhe técnico
> - `packages/observability-langfuse/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/observability-langfuse/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx:1` — handoff documental de agentes.
> - `packages/observability-langfuse/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
