---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/svelte"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/svelte/package.json", "packages/svelte/src/index.ts", "apps/docs-next/content/docs/for-agents/svelte.mdx", "AGENTS.md", "packages/svelte/CONVENTIONS.md", "packages/svelte/tests/components.test.ts", "packages/svelte/tests/package-manifest.test.ts", "packages/svelte/tests/ssr.test.ts", "packages/svelte/tests/store.test.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-svelte

> [!tldr] Em linguagem comum
> Pacote svelte do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/svelte` publica a superfície definida em `packages/svelte/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/svelte.mdx` e limita edições a `packages/svelte`. Fonte: `packages/svelte/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.svelte`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createChatStore` | export nomeado | API pública do pacote. | `packages/svelte/src/index.ts:1` |
| `SvelteChatStore` | export nomeado | API pública do pacote. | `packages/svelte/src/index.ts:3` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { createChatStore } from '@agentskit/svelte'` — `packages/svelte/README.md:54`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/svelte/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/svelte.mdx` (`.doc-bridge/index.json`, `handoffs.svelte`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/svelte.mdx`, `packages/svelte/CONVENTIONS.md` e `packages/svelte/src/index.ts`.
- **Raiz de edição do handoff:** `packages/svelte` (`.doc-bridge/index.json`, `handoffs.svelte`).
- **Invariantes:** Browser-only side effects at module top level (SSR components must render) (`packages/svelte/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/svelte/tests/components.test.ts`, `packages/svelte/tests/package-manifest.test.ts`, `packages/svelte/tests/ssr.test.ts`, `packages/svelte/tests/store.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/svelte test` e `pnpm --filter @agentskit/svelte lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0020 - Estado de interação serializável]]. Histórico recente (`git log --oneline -15 -- packages/svelte`):

- `e8d42064 chore: version packages (#1757)`
- `8bf15b0a feat(core): durable tool decisions and multimodal sends (#1828)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/svelte/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/svelte/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/svelte.mdx:1` — handoff documental de agentes.
> - `packages/svelte/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
