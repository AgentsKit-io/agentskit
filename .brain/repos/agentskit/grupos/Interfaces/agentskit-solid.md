---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/solid"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/solid/package.json", "packages/solid/src/index.ts", "apps/docs-next/content/docs/for-agents/solid.mdx", "AGENTS.md", "packages/solid/CONVENTIONS.md", "packages/solid/tests/components.test.ts", "packages/solid/tests/package-manifest.test.ts", "packages/solid/tests/useChat.test.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0022-public-package-consolidation.md", "docs/architecture/adrs/0033-registry-ecosystem-shell.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-solid

> [!tldr] Em linguagem comum
> Pacote solid do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/solid` publica a superfície definida em `packages/solid/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/solid.mdx` e limita edições a `packages/solid`. Fonte: `packages/solid/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.solid`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `useChat` | export nomeado | API pública do pacote. | `packages/solid/src/index.ts:1` |
| `{` | export nomeado | API pública do pacote. | `packages/solid/src/index.ts:14` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `const mod = await import('@agentskit/solid/use-chat') as { useChat: unknown }` — `packages/solid/tests/package-manifest.test.ts:44`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/solid/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/solid.mdx` (`.doc-bridge/index.json`, `handoffs.solid`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: VITE_ANTHROPIC_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/solid.mdx`, `packages/solid/CONVENTIONS.md` e `packages/solid/src/index.ts`.
- **Raiz de edição do handoff:** `packages/solid` (`.doc-bridge/index.json`, `handoffs.solid`).
- **Invariantes:** Siga os limites de responsabilidade e compatibilidade descritos em CONVENTIONS.md. (`packages/solid/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/solid/tests/components.test.ts`, `packages/solid/tests/package-manifest.test.ts`, `packages/solid/tests/useChat.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/solid test` e `pnpm --filter @agentskit/solid lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0022 - Consolidate vendor adapters into owning packages]], [[agentskit ADR-0033 - Registry adopts the ecosystem shell]], [[agentskit ADR-0035 - Documentation pruning and API reference route consolidation]]. Histórico recente (`git log --oneline -15 -- packages/solid`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/solid/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/solid/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/solid.mdx:1` — handoff documental de agentes.
> - `packages/solid/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
