---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/skills"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/skills/package.json", "packages/skills/src/index.ts", "apps/docs-next/content/docs/for-agents/skills.mdx", "AGENTS.md", "packages/skills/CONVENTIONS.md", "packages/skills/tests/adr-0005-contract.test.ts", "packages/skills/tests/compose.test.ts", "packages/skills/tests/discovery.test.ts", "packages/skills/tests/extra-skills.test.ts", "docs/architecture/adrs/0004-retriever-contract.md", "docs/architecture/adrs/0005-skill-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-skills

> [!tldr] Em linguagem comum
> Pacote skills do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/skills` publica a superfície definida em `packages/skills/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/skills.mdx` e limita edições a `packages/skills`. Fonte: `packages/skills/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.skills`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `researcher` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:1` |
| `coder` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:2` |
| `planner` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:3` |
| `critic` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:4` |
| `summarizer` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:5` |
| `codeReviewer` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:6` |
| `prReviewer` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:7` |
| `sqlGen` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:8` |
| `dataAnalyst` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:9` |
| `translator` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:10` |
| `translatorWithGlossary` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:10` |
| `GlossaryEntry` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:11` |
| `sqlAnalyst` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:12` |
| `technicalWriter` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:13` |
| `securityAuditor` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:14` |
| `customerSupport` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:15` |
| `healthcareAssistant` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:16` |
| `clinicalNoteSummarizer` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:16` |
| `financialAdvisor` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:17` |
| `transactionTriage` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:17` |
| `legalAssistant` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:18` |
| `contractReviewer` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:18` |
| `tutor` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:19` |
| `curriculumDesigner` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:19` |
| `storefrontConcierge` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:20` |
| `merchandisingAnalyst` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:20` |
| `listingConcierge` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:21` |
| `marketAnalyst` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:21` |
| `{` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:29` |
| `composeSkills` | export nomeado | API pública do pacote. | `packages/skills/src/index.ts:35` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { researcher, coder, composeSkills } from '@agentskit/skills'` — `packages/skills/README.md:54`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/skills/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/skills.mdx` (`.doc-bridge/index.json`, `handoffs.skills`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: ANTHROPIC_API_KEY, FOO_API_KEY. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/skills.mdx`, `packages/skills/CONVENTIONS.md` e `packages/skills/src/index.ts`.
- **Raiz de edição do handoff:** `packages/skills` (`.doc-bridge/index.json`, `handoffs.skills`).
- **Invariantes:** Kebab-case for bundled multi-word `name` fields; all names must satisfy ADR 0005 S1. (`packages/skills/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/skills/tests/adr-0005-contract.test.ts`, `packages/skills/tests/compose.test.ts`, `packages/skills/tests/discovery.test.ts`, `packages/skills/tests/extra-skills.test.ts`, `packages/skills/tests/marketplace.test.ts`, `packages/skills/tests/pr-reviewer.test.ts`, `packages/skills/tests/safety-boundary.test.ts`, `packages/skills/tests/skills.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/skills test` e `pnpm --filter @agentskit/skills lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0004 - Contrato de retriever]], [[agentskit ADR-0005 - Contrato de skill]], [[agentskit ADR-0009 - Regras de composição e dependência]]. Histórico recente (`git log --oneline -15 -- packages/skills`):

- `e8d42064 chore: version packages (#1757)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`
- `9226c833 chore: version packages (#1618)`
- `08fce242 chore: retire public AKOS references (#1615)`

> [!info]- Detalhe técnico
> - `packages/skills/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/skills/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/skills.mdx:1` — handoff documental de agentes.
> - `packages/skills/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
