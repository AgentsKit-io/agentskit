---
tipo: pacote
repo: agentskit
grupo: Ferramentas de desenvolvimento
npm: "@agentskit/templates"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/templates/package.json", "packages/templates/src/index.ts", "apps/docs-next/content/docs/for-agents/templates.mdx", "AGENTS.md", "packages/templates/CONVENTIONS.md", "packages/templates/tests/factories.test.ts", "packages/templates/tests/package-manifest.test.ts", "packages/templates/tests/scaffold-security.test.ts", "packages/templates/tests/scaffold.test.ts", "docs/architecture/adrs/0009-composition-rules.md", "docs/architecture/adrs/0035-docs-pruning-and-api-route-consolidation.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/ferramentas-de-desenvolvimento]
---

# agentskit-templates

> [!tldr] Em linguagem comum
> Pacote templates do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Ferramentas de desenvolvimento]]

## O que faz e por que existe

O pacote `@agentskit/templates` publica a superfície definida em `packages/templates/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/templates.mdx` e limita edições a `packages/templates`. Fonte: `packages/templates/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.templates`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `{` | export nomeado | API pública do pacote. | `packages/templates/src/index.ts:6` |
| `ScaffoldType` | export nomeado | API pública do pacote. | `packages/templates/src/index.ts:17` |
| `ScaffoldConfig` | export nomeado | API pública do pacote. | `packages/templates/src/index.ts:17` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { createToolTemplate } from '@agentskit/templates'` — `packages/templates/README.md:55`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/templates/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/templates.mdx` (`.doc-bridge/index.json`, `handoffs.templates`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/templates.mdx`, `packages/templates/CONVENTIONS.md` e `packages/templates/src/index.ts`.
- **Raiz de edição do handoff:** `packages/templates` (`.doc-bridge/index.json`, `handoffs.templates`).
- **Invariantes:** implementation stubs must be completed before publication (`packages/templates/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/templates/tests/factories.test.ts`, `packages/templates/tests/package-manifest.test.ts`, `packages/templates/tests/scaffold-security.test.ts`, `packages/templates/tests/scaffold.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/templates test` e `pnpm --filter @agentskit/templates lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0035 - Documentation pruning and API reference route consolidation]]. Histórico recente (`git log --oneline -15 -- packages/templates`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `81df5c2c docs(templates): clarify generated network code scope (#1759)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/templates/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/templates/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/templates.mdx:1` — handoff documental de agentes.
> - `packages/templates/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
