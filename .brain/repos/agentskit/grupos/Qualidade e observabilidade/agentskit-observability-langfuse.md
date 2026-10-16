---
tipo: pacote
repo: agentskit
grupo: Qualidade e observabilidade
npm: "@agentskit/observability-langfuse"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/observability-langfuse/package.json", "packages/observability-langfuse/src/index.ts", "packages/observability-langfuse/src/langfuse.ts", "packages/observability-langfuse/src/langfuse-snapshot.ts", "packages/observability-langfuse/README.md", "apps/docs-next/content/docs/for-agents/observability-langfuse.mdx", "AGENTS.md", "packages/observability-langfuse/CONVENTIONS.md", "packages/observability-langfuse/tests/langfuse-missing.test.ts", "packages/observability-langfuse/tests/langfuse-snapshot.test.ts", "packages/observability-langfuse/tests/langfuse-types.test.ts", "packages/observability-langfuse/tests/langfuse.test.ts", "docs/architecture/adrs/0012-vendor-adapter-scope.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/qualidade-e-observabilidade]
---

# agentskit-observability-langfuse

> [!tldr] Em linguagem comum
> Envia a telemetria de execuções de agente para o Langfuse, uma plataforma de observabilidade de LLMs. Cada execução serializada vira um `trace`. As chaves e o host vêm de variáveis de ambiente.

← [[00 Grupo - agentskit - Qualidade e observabilidade]]

## O que faz e por que existe

Integração com o provedor Langfuse. Faz par com o primitivo `Observer` de `@agentskit/core` e com o rastreador de spans de `@agentskit/observability` (`packages/observability-langfuse/CONVENTIONS.md:3`). Escopo: um `trace` do Langfuse por execução de agente serializada (`packages/observability-langfuse/CONVENTIONS.md:11`). O contrato do adapter é declarado estável; mudanças incompatíveis no SDK `langfuse` upstream podem forçar bumps de versão menor (`packages/observability-langfuse/CONVENTIONS.md:7`). Dependências: `@agentskit/core` e `@agentskit/observability` (`packages/observability-langfuse/package.json:44-45`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx` e limita edições a `packages/observability-langfuse` (`.doc-bridge/index.json`, `handoffs.observability-langfuse`).

## API e contratos

Exports de `packages/observability-langfuse/src/index.ts`:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `langfuse` | função | Cria o observador que envia os eventos ao Langfuse. Lê chaves e host do ambiente quando não recebidos por opção. | `packages/observability-langfuse/src/index.ts:1`; `packages/observability-langfuse/src/langfuse.ts:34-38` |
| `LangfuseConfig` | tipo | Opções de configuração do observador (chaves, host, release, ambiente). | `packages/observability-langfuse/src/index.ts:2` |
| `LangfuseObserver` | tipo | Formato do observador devolvido por `langfuse`. | `packages/observability-langfuse/src/index.ts:2` |

Exemplo real do README (import do observador):

```ts
import { langfuse } from '@agentskit/observability/langfuse'
```

Fonte: `packages/observability-langfuse/README.md:43`.

> [!question] Dúvida
> O README importa `langfuse` de `@agentskit/observability/langfuse`, mas `packages/observability-langfuse/src/index.ts` exporta `langfuse` diretamente. Qual dos dois caminhos é o público não está confirmado no manifesto auditado; ver [[Dúvidas abertas]] e a dúvida equivalente em [[agentskit-observability]].

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] (`packages/observability-langfuse/package.json:44`), [[agentskit-observability]] (`packages/observability-langfuse/package.json:45`) |
| Consumidores no monorepo | Nenhum `package.json` do monorepo declara `@agentskit/observability-langfuse`. |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx` (`.doc-bridge/index.json`, `handoffs.observability-langfuse`) |

## Dados e efeitos

- Variáveis de ambiente lidas em `packages/observability-langfuse/src/langfuse.ts`, quando a opção correspondente não é passada:
  - `LANGFUSE_PUBLIC_KEY` (`:34`) e `LANGFUSE_SECRET_KEY` (`:35`): credenciais do Langfuse. Os valores nunca são copiados para a documentação.
  - `LANGFUSE_HOST` (`:36`): host do Langfuse; sem valor, usa `https://cloud.langfuse.com`.
  - `LANGFUSE_RELEASE` (`:37`) e `LANGFUSE_ENVIRONMENT` (`:38`): metadados de release e de ambiente enviados junto aos traces.
- A leitura é feita por `envOr` (`packages/observability-langfuse/src/langfuse-snapshot.ts:7-9`), que lê `process.env` quando disponível.
- Variável só de teste: `AK_LANGFUSE_TEST_KEY` (`packages/observability-langfuse/tests/langfuse-snapshot.test.ts:40`).
- Rede: envia traces ao host do Langfuse. Os testes unitários usam um cliente simulado e não acessam a rede (`packages/observability-langfuse/CONVENTIONS.md:29`).

## Como mexer (para agentes)

- **Comece por:** `packages/observability-langfuse/CONVENTIONS.md`, `packages/observability-langfuse/src/index.ts` e `packages/observability-langfuse/src/langfuse.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/observability-langfuse.mdx`.
- **Raiz de edição do handoff:** `packages/observability-langfuse` (`.doc-bridge/index.json`, `handoffs.observability-langfuse`).
- **Invariantes:**
  - Erros do SDK são engolidos e verificados com `expect(...).not.toThrow()`; `onError` é o canal opcional e isolado para os erros (`packages/observability-langfuse/CONVENTIONS.md:30`).
  - Testes unitários simulam o SDK `langfuse` e não acessam a rede (`packages/observability-langfuse/CONVENTIONS.md:29`).
  - Novo atributo: mapear em `startRemote` / `endRemote` de `langfuse.ts` e cobrir com teste usando o cliente simulado (`packages/observability-langfuse/CONVENTIONS.md:24-25`).
- **Testes:** `tests/langfuse.test.ts` (fluxo principal), `tests/langfuse-snapshot.test.ts` (leitura de ambiente), `tests/langfuse-missing.test.ts` (SDK ausente) e `tests/langfuse-types.test.ts` (tipos).
- **Validação:** `pnpm --filter @agentskit/observability-langfuse test` (executa `vitest run`, `packages/observability-langfuse/package.json:38`) e `pnpm --filter @agentskit/observability-langfuse lint` (`tsc --noEmit`, `packages/observability-langfuse/package.json:40`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados identificados pelo documento citado na fonte: [[agentskit ADR-0012 - Escopo e granularidade dos adapters de fornecedor]]. Histórico recente (`git log --oneline -8 -- packages/observability-langfuse`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `b3021dac docs: document remaining public APIs (DOC-03 batch 4) (#1816)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `02ca0b8e chore: version packages`
- `9226c833 chore: version packages (#1618)`
- `08fce242 chore: retire public AKOS references (#1615)`

> [!info]- Detalhe técnico
> - `packages/observability-langfuse/package.json:1` — manifesto, dependências (`:44-45`) e scripts (`:38`, `:40`).
> - `packages/observability-langfuse/src/index.ts:1` — entrada pública (três exports).
> - `packages/observability-langfuse/src/langfuse.ts:34` — leitura de chaves, host, release e ambiente.
> - `packages/observability-langfuse/src/langfuse-snapshot.ts:7` — função `envOr`.
> - `packages/observability-langfuse/CONVENTIONS.md:29` — testes sem rede e tratamento de erros.
