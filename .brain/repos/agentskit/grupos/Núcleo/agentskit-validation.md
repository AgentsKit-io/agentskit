---
tipo: pacote
repo: agentskit
grupo: Núcleo
npm: "@agentskit/validation"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores em manifests e imports; auditado em 2026-10-16"
fontes: ["packages/validation/package.json", "packages/validation/src/index.ts", "packages/validation/src/ajv-validator.ts", "packages/validation/README.md", "packages/tools/tsup.config.ts", "packages/tools/package.json", "packages/tools/src/mcp/server.ts", "apps/ask-backend/src/server.ts", "apps/ask-backend/Dockerfile", "apps/docs-next/content/docs/for-agents/validation.mdx", "packages/validation/CONVENTIONS.md", "packages/validation/tests/ajv-validator.test.ts", "packages/validation/tests/package-manifest.test.ts", "docs/architecture/adrs/0008-runtime-validation.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/nucleo]
---

# agentskit-validation

> [!tldr] Em linguagem comum
> Confere se os argumentos que um modelo gera para uma ferramenta obedecem ao JSON Schema da ferramenta, antes de ela rodar. É um pacote privado: quem usa o AgentsKit importa a validação por `@agentskit/tools/validation`.

← [[00 Grupo - agentskit - Núcleo]]

## O que faz e por que existe

O pacote `@agentskit/validation` é a implementação Ajv do contrato `ArgsValidator` do core (ADR 0008). A saída do modelo é tratada como dado não confiável; a validação roda em tempo de execução, antes de `execute`, sem colocar Ajv no core (`packages/validation/README.md:15`). É opt-in e o core continua sem dependências (`packages/validation/CONVENTIONS.md:1-9`, `:27-28`). O pacote é `private: true` (`packages/validation/package.json:3`) e está em beta (`:53`).

## API e contratos

Exports de `packages/validation/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createAjvValidator` | função | Cria um `ArgsValidator` que valida argumentos contra o JSON Schema da ferramenta | `src/index.ts:1` (`src/ajv-validator.ts`) |
| `AjvValidatorOptions` | tipo | Opções: `rejectAdditionalProperties` (padrão `false`), `coerceTypes` (padrão `false`), `ajv` pré-configurado, `preflight` | `src/index.ts:2` |

Exemplo real (README do pacote, `packages/validation/README.md:47-49`):

```ts
import { createAjvValidator } from '@agentskit/tools/validation'

const validate = createAjvValidator()
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/validation/package.json:42`) |
| Dependência externa | `ajv` ^8.20.0 (`packages/validation/package.json:43`) |
| Consumidor direto | `packages/tools`: o subpath `./validation` (`packages/tools/package.json:52-55`) é gerado de `../validation/src/index.ts` (`packages/tools/tsup.config.ts:11`). `packages/tools/src/mcp/server.ts:11` importa `createAjvValidator` do código-fonte por caminho relativo. |
| Consumidor de app | `apps/ask-backend/src/server.ts:24` e `:271` (`createAjvValidator({ coerceTypes: true })` via `@agentskit/tools/validation`). O Dockerfile do ask-backend monta o pacote com `--filter='@agentskit/validation...'` (`apps/ask-backend/Dockerfile:34`). |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/validation.mdx` (`.doc-bridge/index.json`, `handoffs.validation`) |
| Consumidores fora do repo | Via `@agentskit/tools/validation` (API pública de tools); não confirmado nesta auditoria. |

## Dados e efeitos

- Sem I/O, rede ou variável de ambiente no código de validação (nenhuma verificada).
- Memória: validadores compilados ficam em cache por identidade do schema (`WeakMap`, `packages/validation/CONVENTIONS.md:18`).
- Erro de argumento: a mensagem nunca inclui os valores dos argumentos (`CONVENTIONS.md:45`); o erro segue o caminho `AK_TOOL_INVALID_INPUT` do core (`CONVENTIONS.md:20`).

## Como mexer (para agentes)

- **Comece por:** `packages/validation/src/ajv-validator.ts` (implementação), `packages/validation/CONVENTIONS.md` (regras) e `packages/validation/README.md` (uso).
- **Raiz de edição do handoff:** `packages/validation` (`.doc-bridge/index.json`, `handoffs.validation`).
- **Invariantes** (`packages/validation/CONVENTIONS.md:30-45`):
  - Dependências de runtime só `ajv` e `@agentskit/core`.
  - Ferramenta sem `schema` passa direto.
  - Falhar fechado em argumento inválido; não reescrever payload salvo se `coerceTypes` estiver ligado.
  - Padrões permissivos para propriedades extras; modo estrito é opt-in.
  - Não mutar o schema do chamador.
  - Schemas são configuração confiável; erro de compilação propaga.
  - O contrato `ArgsValidator` é fixado pelo ADR 0008; mudança de contrato vai para o core com ADR (`CONVENTIONS.md:8-9`).
- **Testes:** `packages/validation/tests/ajv-validator.test.ts` (schemas aninhados, refs, composições, opções, cache) e `package-manifest.test.ts` (confere que o único export é `createAjvValidator`, linha 36).
- **Validação do pacote:** `pnpm --filter @agentskit/validation test` (`packages/validation/package.json:36`) e `pnpm --filter @agentskit/validation lint` (`:38`, `tsc --noEmit`). Cobertura de linhas: 90% (`CONVENTIONS.md:51`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:55-61`): introduzir Zod; ligar validação por padrão no core; recompilar Ajv a cada chamada; rejeitar chaves extras por padrão; lançar `Error` puro em vez do erro tipado.
- **Quem revisa:** checklist em `CONVENTIONS.md:63-70`, incluindo a regra de importação pública `@agentskit/tools/validation`.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0002 - Contrato de ferramenta]] (argumentos de ferramenta) e [[agentskit ADR-0008 - Validação de argumentos em runtime]] (contrato `ArgsValidator`).

Histórico recente (`git log --oneline -15 -- packages/validation`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `08fce242 chore: retire public AKOS references (#1615)`

> [!info]- Detalhe técnico
> - `packages/validation/package.json:1` — manifesto (privado), versão, dependências e scripts.
> - `packages/validation/src/index.ts:1` — entrada do pacote.
> - `packages/tools/tsup.config.ts:11` — ponto em que o subpath `validation` de tools é gerado.
> - `apps/docs-next/content/docs/for-agents/validation.mdx:1` — handoff documental de agentes.
> - `packages/validation/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
