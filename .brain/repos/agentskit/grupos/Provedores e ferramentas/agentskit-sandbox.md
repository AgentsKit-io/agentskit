---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/sandbox"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/sandbox/package.json", "packages/sandbox/src/index.ts", "apps/docs-next/content/docs/for-agents/sandbox.mdx", "AGENTS.md", "packages/sandbox/CONVENTIONS.md", "packages/sandbox/tests/container-runtimes.test.ts", "packages/sandbox/tests/e2b-backend.test.ts", "packages/sandbox/tests/local-registry-import.test.ts", "packages/sandbox/tests/local-registry.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-sandbox

> [!tldr] Em linguagem comum
> Pacote sandbox do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/sandbox` publica a superfície definida em `packages/sandbox/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/sandbox.mdx` e limita edições a `packages/sandbox`. Fonte: `packages/sandbox/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.sandbox`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createSandbox` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:1` |
| `Sandbox` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:2` |
| `SandboxConfig` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:2` |
| `sandboxTool` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:4` |
| `createE2BBackend` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:6` |
| `E2BConfig` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:7` |
| `SandboxBackend` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:9` |
| `ExecuteOptions` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:9` |
| `ExecuteResult` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:9` |
| `createMandatorySandbox` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:11` |
| `{` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:12` |
| `SANDBOX_LEVELS` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:21` |
| `{` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:22` |
| `nodeSpawner` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:32` |
| `{` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:40` |
| `{` | export nomeado | API pública do pacote. | `packages/sandbox/src/index.ts:53` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `import { sandboxTool } from '@agentskit/sandbox'` — `packages/sandbox/README.md:56`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]], [[agentskit-cross-platform]] (`packages/sandbox/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/sandbox.mdx` (`.doc-bridge/index.json`, `handoffs.sandbox`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: ANTHROPIC_API_KEY, E2B_API_KEY, PATH. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/sandbox.mdx`, `packages/sandbox/CONVENTIONS.md` e `packages/sandbox/src/index.ts`.
- **Raiz de edição do handoff:** `packages/sandbox` (`.doc-bridge/index.json`, `handoffs.sandbox`).
- **Invariantes:** Siga os limites de responsabilidade e compatibilidade descritos em CONVENTIONS.md. (`packages/sandbox/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/sandbox/tests/container-runtimes.test.ts`, `packages/sandbox/tests/e2b-backend.test.ts`, `packages/sandbox/tests/local-registry-import.test.ts`, `packages/sandbox/tests/local-registry.test.ts`, `packages/sandbox/tests/local-runtimes-extra.test.ts`, `packages/sandbox/tests/local-runtimes.test.ts`, `packages/sandbox/tests/local-sandbox-types.test.ts`, `packages/sandbox/tests/local-spawner.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/sandbox test` e `pnpm --filter @agentskit/sandbox lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0002 - Tool Contract]], [[agentskit ADR-0006 - Runtime Contract]], [[agentskit ADR-0009 - Composition & dependency rules]], [[agentskit ADR-0031 - Shared CLI adapter execution boundary]], [[agentskit ADR-0036 - One package owns OS and runtime portability]]. Histórico recente (`git log --oneline -15 -- packages/sandbox`):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `109488c8 chore: audit dead deps and align Node engines (#1783)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `76d56aa1 fix(sandbox): defer cross-platform spawner import (#1695)`
- `ee56f43d perf(ci): reuse Turbo build prerequisites across checks (#1700)`

> [!info]- Detalhe técnico
> - `packages/sandbox/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/sandbox/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/sandbox.mdx:1` — handoff documental de agentes.
> - `packages/sandbox/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
