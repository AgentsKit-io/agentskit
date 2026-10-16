---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/validation"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/validation/package.json", "packages/validation/src/index.ts", "apps/docs-next/content/docs/for-agents/validation.mdx", "AGENTS.md", "packages/validation/CONVENTIONS.md", "packages/validation/tests/ajv-validator.test.ts", "packages/validation/tests/package-manifest.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0004-retriever-contract.md", "docs/architecture/adrs/0008-runtime-validation.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-validation

> [!tldr] Em linguagem comum
> Pacote validation do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/validation` publica a superfície definida em `packages/validation/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/validation.mdx` e limita edições a `packages/validation`. Fonte: `packages/validation/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.validation`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createAjvValidator` | export nomeado | API pública do pacote. | `packages/validation/src/index.ts:1` |
| `AjvValidatorOptions` | export nomeado | API pública do pacote. | `packages/validation/src/index.ts:2` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `- Public consumers import `@agentskit/tools/validation`; `@agentskit/validation` is a private workspace implementation.` — `packages/validation/README.md:22`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/validation/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/validation.mdx` (`.doc-bridge/index.json`, `handoffs.validation`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: Nenhuma variável de ambiente identificada pela busca estática no pacote. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/validation.mdx`, `packages/validation/CONVENTIONS.md` e `packages/validation/src/index.ts`.
- **Raiz de edição do handoff:** `packages/validation` (`.doc-bridge/index.json`, `handoffs.validation`).
- **Invariantes:** Making validation mandatory in core (must remain opt-in so core stays (`packages/validation/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/validation/tests/ajv-validator.test.ts`, `packages/validation/tests/package-manifest.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/validation test` e `pnpm --filter @agentskit/validation lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0002 - Tool Contract]], [[agentskit ADR-0004 - Retriever Contract]], [[agentskit ADR-0008 - Runtime argument validation]], [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0011 - Inbound request validation (chat triggers)]], [[agentskit ADR-0012 - Vendor adapter scope & granularity]], [[agentskit ADR-0013 - Runtime validation for serialized message records]], [[agentskit ADR-0014 - Trusted application tool-call proposal]], [[agentskit ADR-0015 - Tool authorization before proposal and execution]], [[agentskit ADR-0020 - Serializable interaction state]], [[agentskit ADR-0021 - Versioned ecosystem manifest and evidence-backed claims]], [[agentskit ADR-0022 - Consolidate vendor adapters into owning packages]], [[agentskit ADR-0027 - Statechart beta safety boundaries]], [[agentskit ADR-0028 - MCP bridge beta boundaries]], [[agentskit ADR-0031 - Shared CLI adapter execution boundary]], [[agentskit ADR-0043 - Partition-bound RAG composition]]. Histórico recente (`git log --oneline -15 -- packages/validation`):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`
- `9226c833 chore: version packages (#1618)`
- `08fce242 chore: retire public AKOS references (#1615)`
- `9266a6da chore(deps): refresh minor and patch versions`

> [!info]- Detalhe técnico
> - `packages/validation/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/validation/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/validation.mdx:1` — handoff documental de agentes.
> - `packages/validation/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
