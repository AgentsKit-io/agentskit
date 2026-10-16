---
tipo: pacote
repo: agentskit
grupo: Ferramentas de desenvolvimento
npm: "@agentskit/templates"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/templates/package.json", "packages/templates/src/index.ts", "packages/templates/README.md", "apps/docs-next/content/docs/for-agents/templates.mdx", "AGENTS.md", "packages/templates/CONVENTIONS.md", "packages/templates/tests/factories.test.ts", "packages/templates/tests/package-manifest.test.ts", "packages/templates/tests/scaffold-security.test.ts", "packages/templates/tests/scaffold.test.ts", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/ferramentas-de-desenvolvimento]
---

# agentskit-templates

> [!tldr] Em linguagem comum
> Fábricas e validadores de modelos de código do AgentsKit: criam a definição de uma ferramenta, de uma skill ou de um adapter já com os campos obrigatórios conferidos, e geram projetos de partida (scaffold).

← [[00 Grupo - agentskit - Ferramentas de desenvolvimento]]

## O que faz e por que existe

Reúne as fábricas validadas (`createToolTemplate`, `createSkillTemplate`, `createAdapterTemplate`), que checam os campos obrigatórios antes do código do usuário rodar (`packages/templates/README.md:41`), e o scaffold de projetos (`scaffold`, `SCAFFOLD_TYPES`, `validateScaffoldConfig`). O `CONVENTIONS.md` lista as fábricas validadas no escopo (`packages/templates/CONVENTIONS.md:9`). Depende apenas de `@agentskit/core` (`packages/templates/package.json:50`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/templates.mdx` e limita edições a `packages/templates` (`.doc-bridge/index.json`, `handoffs.templates`).

## API e contratos

Exports de `packages/templates/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createToolTemplate`, `createSkillTemplate`, `createAdapterTemplate` | funções | Fábricas validadas para ferramenta, skill e adapter. | `packages/templates/src/index.ts:1-5` |
| `ToolTemplateConfig`, `SkillTemplateConfig`, `AdapterTemplateConfig` | tipos | Configuração aceita por cada fábrica. | `packages/templates/src/index.ts:6-10` |
| `scaffold`, `SCAFFOLD_TYPES`, `validateScaffoldConfig` | função, constante e função | Gera um projeto de partida, lista os tipos suportados e valida a configuração. | `packages/templates/src/index.ts:12-16` |
| `ScaffoldType`, `ScaffoldConfig` | tipos | Tipo de scaffold e sua configuração. | `packages/templates/src/index.ts:17` |
| `validateToolTemplate`, `validateSkillTemplate`, `validateAdapterTemplate` | funções | Validação das configurações das fábricas. | `packages/templates/src/index.ts:19-23` |

Exemplo real de uso, do README:

```ts
import { createToolTemplate } from '@agentskit/templates'
```

Fonte: `packages/templates/README.md:55`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/templates/package.json:50`, `"@agentskit/core": "workspace:*"`) |
| Consumidores no monorepo | A raiz do monorepo declara `"@agentskit/templates": "workspace:*"` (`package.json:93`). Nenhum outro `package.json` do monorepo declara o pacote. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/templates.mdx` (`.doc-bridge/index.json`, `handoffs.templates`) |

## Dados e efeitos

- Nenhuma leitura de variável de ambiente em `packages/templates/src` (busca por `process.env` e `import.meta.env` sem resultado).
- O pacote gera código de exemplo para ferramentas, skills e adapters. O commit `81df5c2c` esclareceu o escopo do código de rede gerado (ver histórico); o código gerado não é executado pelo pacote.
- Sem permissões ou capabilities exigidas.

## Como mexer (para agentes)

- **Comece por:** `packages/templates/CONVENTIONS.md`, `packages/templates/src/index.ts` e `packages/templates/src/scaffold.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/templates.mdx`.
- **Raiz de edição do handoff:** `packages/templates` (`.doc-bridge/index.json`, `handoffs.templates`).
- **Invariantes:** stubs de implementação devem estar completos antes da publicação (`packages/templates/CONVENTIONS.md:13`).
- **Testes:** `packages/templates/tests/factories.test.ts` (fábricas), `tests/scaffold.test.ts` (scaffold), `tests/scaffold-security.test.ts` (segurança do scaffold) e `tests/package-manifest.test.ts` (manifesto).
- **Validação:** `pnpm --filter @agentskit/templates test` (executa `vitest run`, `packages/templates/package.json:44`) e `pnpm --filter @agentskit/templates lint` (`tsc --noEmit`, `packages/templates/package.json:46`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADR relacionado identificado pelo documento citado na fonte: [[agentskit ADR-0009 - Regras de composição e dependência]]. Histórico recente (`git log --oneline -8 -- packages/templates`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `81df5c2c docs(templates): clarify generated network code scope (#1759)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/templates/package.json:1` — manifesto, dependência (`:50`) e scripts (`:44`, `:46`).
> - `packages/templates/src/index.ts:1` — entrada pública.
> - `packages/templates/README.md:55` — exemplo de import.
> - `packages/templates/CONVENTIONS.md:13` — invariante de stubs.
