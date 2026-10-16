---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/skills"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores e de variáveis de ambiente por git grep; auditado em 2026-10-16"
fontes: ["packages/skills/package.json", "packages/skills/src/index.ts", "packages/skills/src/technical-writer.ts", "packages/skills/README.md", "apps/docs-next/content/docs/for-agents/skills.mdx", "AGENTS.md", "packages/skills/CONVENTIONS.md", "packages/skills/tests/adr-0005-contract.test.ts", "packages/skills/tests/compose.test.ts", "packages/skills/tests/discovery.test.ts", "packages/skills/tests/marketplace.test.ts", "docs/architecture/adrs/0005-skill-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-skills

> [!tldr] Em linguagem comum
> Um catálogo de "personas" prontas: cada skill é um texto de instruções (papel, passos, formato de saída) que faz o modelo agir como pesquisador, revisor de código, analista de SQL, assistente jurídico e assim por diante. Skill não executa código; ferramenta sim.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/skills` traz as skills prontas que cumprem o contrato de skill (ADR 0005) (`packages/skills/CONVENTIONS.md:3`). Ele cuida de skills declarativas de uso geral, engenharia, dados, suporte e domínios regulados, além de composição, descoberta defensiva e um marketplace em memória (`CONVENTIONS.md:6-8`). Uma skill não tem método `run` nem `execute` (`CONVENTIONS.md:35-37`).

## API e contratos

Exports de `packages/skills/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `researcher`, `coder`, `planner`, `critic`, `summarizer` | `SkillDefinition` | Skills de uso geral | `src/index.ts:1-5` |
| `codeReviewer`, `prReviewer`, `sqlGen`, `dataAnalyst`, `sqlAnalyst`, `technicalWriter`, `securityAuditor` | `SkillDefinition` | Skills de engenharia e dados | `src/index.ts:6-9`, `:12-14` |
| `translator`, `translatorWithGlossary` (+ `GlossaryEntry`) | `SkillDefinition` e tipo | Tradução, com glossário opcional | `src/index.ts:10-11` |
| `customerSupport` | `SkillDefinition` | Suporte ao cliente | `src/index.ts:15` |
| `healthcareAssistant`, `clinicalNoteSummarizer` | `SkillDefinition` | Saúde | `src/index.ts:16` |
| `financialAdvisor`, `transactionTriage` | `SkillDefinition` | Finanças | `src/index.ts:17` |
| `legalAssistant`, `contractReviewer` | `SkillDefinition` | Jurídico | `src/index.ts:18` |
| `tutor`, `curriculumDesigner` | `SkillDefinition` | Educação | `src/index.ts:19` |
| `storefrontConcierge`, `merchandisingAnalyst` | `SkillDefinition` | Comércio | `src/index.ts:20` |
| `listingConcierge`, `marketAnalyst` | `SkillDefinition` | Imobiliário | `src/index.ts:21` |
| `createSkillRegistry`, `parseSemver`, `compareSemver`, `matchesRange` (+ `SkillPackage`, `SkillRegistry`, `SkillRegistryQuery`) | funções e tipos | Marketplace em memória e comparação de versões | `src/index.ts:23-33` (`src/marketplace.ts`) |
| `composeSkills` | função | Compor skills | `src/index.ts:35` (`src/compose.ts`) |
| `listSkills`, `getBuiltinSkills` (+ `SkillMetadata`) | funções e tipo | Descoberta das skills embutidas | `src/index.ts:36-37` (`src/discovery.ts`) |

Exemplo real (README do pacote, `packages/skills/README.md:54`):

```ts
import { researcher, coder, composeSkills } from '@agentskit/skills'
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/skills/package.json:55-57`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/skills.mdx` (`.doc-bridge/index.json`, `handoffs.skills`) |
| Consumidores dentro do repo | 4 manifestos declaram `@agentskit/skills` (busca em `packages` e `apps`, commit `9f8d8551`): `apps/docs-next`, `apps/example-multi-agent`, `apps/example-runtime` e `packages/cli`. |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Nenhum efeito de rede, arquivo ou processo no pacote (`package.json` só tem `@agentskit/core` como dependência, `:55-57`).
- Variáveis de ambiente: nenhuma lida no código. A busca encontrou `process.env.FOO_API_KEY` em `packages/skills/src/technical-writer.ts:54`, mas é texto de exemplo dentro de uma string de skill, não código executado.
- `onActivate` é o único gancho de comportamento e serve para montar ferramentas dinâmicas por usuário ou tenant (`CONVENTIONS.md:39`).

## Como mexer (para agentes)

- **Comece por:** `packages/skills/src/index.ts` (superfície pública), `packages/skills/CONVENTIONS.md` (regras e receita) e uma skill parecida ao que você quer criar (`researcher.ts`, `critic.ts` e `coder.ts`, indicadas em `CONVENTIONS.md:33`).
- **Raiz de edição do handoff:** `packages/skills` (`.doc-bridge/index.json`, `handoffs.skills`).
- **Invariantes** (`packages/skills/CONVENTIONS.md:35-45`, `:72`):
  - Skill não tem `run` nem `execute`; se o modelo chama uma função, é ferramenta.
  - Campos obrigatórios: `name`, `description` (uma linha) e `systemPrompt`.
  - `tools` lista nomes de ferramentas, não definições inline (`CONVENTIONS.md:20`, `:59`).
  - Exemplos são de turno único em v1 (`CONVENTIONS.md:60`).
  - `name` precisa casar com `^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$` (`CONVENTIONS.md:72`).
  - Sem `throw` ou `await` de topo na definição; efeitos vão para `onActivate` (`CONVENTIONS.md:62`).
- **Testes:** todo skill embutida passa por `tests/adr-0005-contract.test.ts`; não criar um harness próprio menor (`CONVENTIONS.md:49`). Ao todo, `packages/skills/tests/` tem 13 arquivos ( entre eles `compose`, `discovery`, `marketplace`, `safety-boundary`, `pr-reviewer` e os `vertical*` de ecommerce, educação e imobiliário).
- **Validação do pacote:** `pnpm --filter @agentskit/skills test` (`packages/skills/package.json:50`, `vitest run`) e `pnpm --filter @agentskit/skills lint` (`:52`, `tsc --noEmit`). Cobertura de linhas: 95%, sobretudo verificações estruturais (`CONVENTIONS.md:68`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:57-63`): definições de ferramenta inline dentro da skill; exemplo multi-turno codificado como um par de entrada e saída; usar `onActivate` para inicialização geral; chamar a skill como função.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0005 - Contrato de skill]] e [[agentskit ADR-0009 - Regras de composição e dependência]] (`composeSkills`).

Histórico recente (`git log --oneline -15 -- packages/skills`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`

> [!info]- Detalhe técnico
> - `packages/skills/package.json:1` — manifesto, versão, `engines` (Node 22 ou superior), dependência e scripts.
> - `packages/skills/src/index.ts:1` — entrada pública.
> - `packages/skills/src/technical-writer.ts:54` — exemplo de texto com `FOO_API_KEY` (não é leitura de ambiente).
> - `apps/docs-next/content/docs/for-agents/skills.mdx:1` — handoff documental de agentes.
> - `packages/skills/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
