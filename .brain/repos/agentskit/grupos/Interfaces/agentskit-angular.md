---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/angular"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/angular/package.json", "packages/angular/src/index.ts", "apps/docs-next/content/docs/for-agents/angular.mdx", "AGENTS.md", "packages/angular/CONVENTIONS.md", "packages/angular/tests/components.test.ts", "packages/angular/tests/package-aot.test.ts", "packages/angular/tests/service.test.ts", "packages/angular/tests/setup.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0020-serializable-interaction-state.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-angular

> [!tldr] Em linguagem comum
> Pacote angular do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/angular` publica a superfície definida em `packages/angular/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/angular.mdx` e limita edições a `packages/angular`. Fonte: `packages/angular/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.angular`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `AgentskitChat` | export nomeado | API pública do pacote. | `packages/angular/src/index.ts:1` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { AgentskitChat, ChatContainerComponent, MessageComponent } from '@agentskit/angular'` — `packages/angular/README.md:55`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/angular/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/angular.mdx` (`.doc-bridge/index.json`, `handoffs.angular`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/angular.mdx`, `packages/angular/CONVENTIONS.md` e `packages/angular/src/index.ts`.
- **Raiz de edição do handoff:** `packages/angular` (`.doc-bridge/index.json`, `handoffs.angular`).
- **Invariantes:** 4. Async actions must return the underlying controller Promise (no fire-and-forget (`packages/angular/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/angular/tests/components.test.ts`, `packages/angular/tests/package-aot.test.ts`, `packages/angular/tests/service.test.ts`, `packages/angular/tests/setup.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/angular test` e `pnpm --filter @agentskit/angular lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0020 - Serializable interaction state]]. Histórico recente (`git log --oneline -15 -- packages/angular`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/angular/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/angular/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/angular.mdx:1` — handoff documental de agentes.
> - `packages/angular/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
