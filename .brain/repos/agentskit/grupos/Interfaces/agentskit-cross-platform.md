---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/cross-platform"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9b31c771 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível)"
fontes: ["packages/cross-platform/package.json", "packages/cross-platform/src/index.ts", "apps/docs-next/content/docs/for-agents/cross-platform.mdx", "AGENTS.md", "packages/cross-platform/CONVENTIONS.md", "packages/cross-platform/tests/baseline.test.ts", "packages/cross-platform/tests/bin.test.ts", "packages/cross-platform/tests/bun-adapter.test.ts", "packages/cross-platform/tests/cli.test.ts", "docs/architecture/adrs/0036-cross-platform-package.md", "docs/architecture/adrs/README.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-cross-platform

> [!tldr] Em linguagem comum
> Pacote cross-platform do AgentsKit: veja a responsabilidade abaixo e a documentação de agente indicada.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

O pacote `@agentskit/cross-platform` publica a superfície definida em `packages/cross-platform/src/index.ts`; a responsabilidade funcional está resumida no handoff do Doc Bridge. O índice aponta o início de leitura em `apps/docs-next/content/docs/for-agents/cross-platform.mdx` e limita edições a `packages/cross-platform`. Fonte: `packages/cross-platform/package.json:1`; `.doc-bridge/index.json` (registro `handoffs.cross-platform`).

## API e contratos

Exports de topo (assinaturas resumidas conforme declarações de exportação):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `CrossPlatformErrorCode` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:10` |
| `DenoPermission` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:10` |
| `SYSTEM_ENV_KEYS` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:11` |
| `getEnv` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:11` |
| `homeDir` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:11` |
| `safeEnv` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:11` |
| `tempDir` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:11` |
| `Env` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:12` |
| `SafeEnvOptions` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:12` |
| `fileUrlToPath` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:13` |
| `isMainModule` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:13` |
| `moduleDir` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:13` |
| `pathToFileUrl` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:13` |
| `copyPath` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:14` |
| `createSymlink` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:14` |
| `removePath` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:14` |
| `renamePath` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:14` |
| `setFileMode` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:14` |
| `writeFileAtomic` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:14` |
| `LinkKind` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:15` |
| `RemoveOptions` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:15` |
| `WriteAtomicOptions` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:15` |
| `spawnProcess` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:16` |
| `spawnShell` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:16` |
| `selectAdapter` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:16` |
| `spawnNodeChild` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:17` |
| `NodeChildOptions` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:18` |
| `runCommand` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:19` |
| `runShell` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:19` |
| `RunOptions` | export nomeado | API pública do pacote. | `packages/cross-platform/src/index.ts:20` |

Exemplo de uso localizado em documentação ou teste:

Exemplo real de import do pacote: `"import { spawnProcess } from '@agentskit/cross-platform'",` — `packages/cross-platform/tests/rules.test.ts:33`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/cross-platform/package.json:1`) |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/cross-platform.mdx` (`.doc-bridge/index.json`, `handoffs.cross-platform`) |
| Consumidores | Consumidores internos identificados por busca de dependências/manifests não foram consolidados nesta nota; uso externo não confirmado. |

## Dados e efeitos

Variáveis identificadas por acesso direto no código: AK_TEST, HOME, HOMEBREW_PREFIX, PATH. Os efeitos e condições de uso dependem dos locais citados nas fontes. configuração indireta por argumentos. Requisitos de rede, arquivos e permissões dependem dos módulos concretos; a entrada pública não basta para afirmar uso em execução. Consulte fontes abaixo antes de alterar efeitos colaterais.

## Como mexer (para agentes)

- **Comece por:** `apps/docs-next/content/docs/for-agents/cross-platform.mdx`, `packages/cross-platform/CONVENTIONS.md` e `packages/cross-platform/src/index.ts`.
- **Raiz de edição do handoff:** `packages/cross-platform` (`.doc-bridge/index.json`, `handoffs.cross-platform`).
- **Invariantes:** **`/pure`** — browser/edge-safe subset; must never import `node:` modules. (`packages/cross-platform/CONVENTIONS.md:1`).
- **Testes encontrados:** `packages/cross-platform/tests/baseline.test.ts`, `packages/cross-platform/tests/bin.test.ts`, `packages/cross-platform/tests/bun-adapter.test.ts`, `packages/cross-platform/tests/cli.test.ts`, `packages/cross-platform/tests/deno-adapter.test.ts`, `packages/cross-platform/tests/env-windows.test.ts`, `packages/cross-platform/tests/env.test.ts`, `packages/cross-platform/tests/errors.test.ts`.
- **Validação indicada pelo índice:** `pnpm --filter @agentskit/cross-platform test` e `pnpm --filter @agentskit/cross-platform lint`. Não executados: `pnpm` não está instalado no ambiente.
- **Armadilha:** não ampliar a responsabilidade do pacote nem introduzir quebra de contrato sem ler os ADRs relacionados.

## Decisões e história

ADRs relacionados identificados por busca no texto: [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]]. Histórico recente (`git log --oneline -15 -- packages/cross-platform`):

- `e8d42064 chore: version packages (#1757)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `3eabaf7f feat(cross-platform): add shared testing helpers (#1777)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `7237b47e feat(core): add core rules ratchet gate (#1694)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/cross-platform/package.json:1` — manifesto, versão, dependências e scripts.
> - `packages/cross-platform/src/index.ts:1` — entrada pública.
> - `apps/docs-next/content/docs/for-agents/cross-platform.mdx:1` — handoff documental de agentes.
> - `packages/cross-platform/CONVENTIONS.md:1` — invariantes e orientação de contribuição.
