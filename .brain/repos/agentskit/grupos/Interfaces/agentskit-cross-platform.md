---
tipo: pacote
repo: agentskit
grupo: Interfaces
npm: "@agentskit/cross-platform"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); auditado em 2026-10-16"
fontes: ["packages/cross-platform/package.json", "packages/cross-platform/src/index.ts", "packages/cross-platform/src/env.ts", "packages/cross-platform/src/process/spawn.ts", "apps/docs-next/content/docs/for-agents/cross-platform.mdx", "AGENTS.md", "packages/cross-platform/CONVENTIONS.md", "packages/cross-platform/tests/spawn.test.ts", "packages/cross-platform/tests/rules.test.ts", "packages/cross-platform/tests/baseline.test.ts", "packages/cross-platform/tests/bin.test.ts", "packages/cross-platform/tests/bun-adapter.test.ts", "packages/cross-platform/tests/cli.test.ts", "docs/architecture/adrs/0036-cross-platform-package.md", "docs/architecture/adrs/README.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/interfaces]
---

# agentskit-cross-platform

> [!tldr] Em linguagem comum
> Ponto único de compatibilidade entre sistemas operacionais e runtimes (Node, Bun e Deno) para processos, caminhos, variáveis de ambiente e arquivos. Outros pacotes do AgentsKit usam este em vez de chamar `child_process` ou corrigir caminhos por conta própria.

← [[00 Grupo - agentskit - Interfaces]]

## O que faz e por que existe

É o dono único da portabilidade de sistema operacional e runtime do ecossistema AgentsKit (ADR-0036). Outros pacotes e repositórios importam daqui em vez de chamar `child_process`, `cross-spawn` ou escrever correções próprias de caminho e fim de linha (`packages/cross-platform/CONVENTIONS.md:3-5`; `docs/architecture/adrs/0036-cross-platform-package.md`). Escopo declarado: processos (`spawnProcess`, `runCommand`, `killProcessTree`, `findExecutable`, `safeEnv`), com um adapter por runtime (`node-adapter`, `bun-adapter`, `deno-adapter`); caminhos e URLs de arquivo; e helpers de lint de portabilidade (`packages/cross-platform/CONVENTIONS.md:9-14`). O pacote depende de `@agentskit/core` (`packages/cross-platform/package.json:62`). O índice do Doc Bridge aponta o início de leitura em `apps/docs-next/content/docs/for-agents/cross-platform.mdx` e limita edições a `packages/cross-platform` (`.doc-bridge/index.json`, `handoffs.cross-platform`).

## API e contratos

Exports de `packages/cross-platform/src/index.ts`, agrupados pela ordem do arquivo:

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `*` de `./pure` | reexport | Subconjunto seguro para navegador e edge (ver invariantes). | `packages/cross-platform/src/index.ts:1` |
| `CrossPlatformError`, `CrossPlatformErrorCodes`, `isNotFoundError`, `isPermissionError`, `mapRuntimeError`, `permissionDenied` | erro e helpers | Erro padronizado com códigos e funções para classificar falhas de runtime. | `packages/cross-platform/src/index.ts:2-9` |
| `CrossPlatformErrorCode`, `DenoPermission` | tipos | Código de erro e permissão do Deno. | `packages/cross-platform/src/index.ts:10` |
| `SYSTEM_ENV_KEYS`, `getEnv`, `homeDir`, `safeEnv`, `tempDir` | ambiente | Lista de variáveis de sistema permitidas, leitura de variáveis e diretórios do usuário e temporário. | `packages/cross-platform/src/index.ts:11` |
| `Env`, `SafeEnvOptions` | tipos | Formato do ambiente e opções de `safeEnv`. | `packages/cross-platform/src/index.ts:12` |
| `fileUrlToPath`, `isMainModule`, `moduleDir`, `pathToFileUrl` | caminhos | Conversão de URL de arquivo e caminho, e detecção do módulo principal. | `packages/cross-platform/src/index.ts:13` |
| `copyPath`, `createSymlink`, `removePath`, `renamePath`, `setFileMode`, `writeFileAtomic` | arquivos | Operações de arquivo portáveis; `writeFileAtomic` escreve de forma atômica. | `packages/cross-platform/src/index.ts:14` |
| `LinkKind`, `RemoveOptions`, `WriteAtomicOptions` | tipos | Opções das operações de arquivo. | `packages/cross-platform/src/index.ts:15` |
| `spawnProcess`, `spawnShell`, `selectAdapter` | processos | Inicia processo; `spawnProcess` nunca lança para falha de início, e `exited` é rejeitada (`packages/cross-platform/CONVENTIONS.md:35`). | `packages/cross-platform/src/index.ts:16` |
| `spawnNodeChild`, `NodeChildOptions` | processos | Variante para filho Node e suas opções. | `packages/cross-platform/src/index.ts:17-18` |
| `runCommand`, `runShell`, `RunOptions`, `RunResult` | processos | Executa comando e espera o resultado. | `packages/cross-platform/src/index.ts:19-20` |
| `killProcessTree` | processos | Encerra a árvore de processos. | `packages/cross-platform/src/index.ts:21` |
| `commandExists`, `findExecutable`, `resolveCommand`, `shellCommand` | resolução | Localiza executáveis e monta o comando para o shell da plataforma. | `packages/cross-platform/src/index.ts:22` |
| `ResolvedCommand`, `WhichOptions` | tipos | Resultado e opções da resolução de comando. | `packages/cross-platform/src/index.ts:23` |
| `ChildHandle`, `ExitStatus`, `SpawnOptions`, `StdioMode`, `TerminationReason` | tipos | Contrato do processo filho e de encerramento. | `packages/cross-platform/src/index.ts:24-30` |
| `PORTABILITY_RULES`, `PortabilityRule` | lint | Regras de portabilidade usadas pelo verificador. | `packages/cross-platform/src/index.ts:31-32` |
| `scanRepository`, `scanText`, `Finding`, `ScanOptions` | lint | Varredura de repositório ou de texto em busca de violações. | `packages/cross-platform/src/index.ts:33-34` |
| `compareToBaseline`, `countFindings`, `tightenBaseline`, `Baseline`, `Comparison` | lint | Compara a varredura com uma linha de base e a torna mais rígida. | `packages/cross-platform/src/index.ts:35-36` |
| `runCli`, `CliIo`, `RunCliOptions` | CLI | Executa o verificador de portabilidade como linha de comando. | `packages/cross-platform/src/index.ts:37-38` |

Exemplo real de uso, em teste de processo:

```ts
const child = spawnProcess(node, ['-e', 'process.stdout.write("out");process.stderr.write("err")'])
```

Fonte: `packages/cross-platform/tests/spawn.test.ts:17`.

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependência interna | [[agentskit-core]] (`packages/cross-platform/package.json:62`, `"@agentskit/core": "workspace:*"`) |
| Consumidores no monorepo | Declaram `"@agentskit/cross-platform": "workspace:*"` em `package.json`: `packages/adapters` (`:72`), `packages/cli` (`:54`), `packages/eval` (`:111`), `packages/memory` (`:89`), `packages/observability` (`:118`), `packages/sandbox` (`:69`), `packages/tools` (`:74`) e `apps/docs-next` (`:38`). |
| Consumidores externos | Não confirmado. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/cross-platform.mdx` (`.doc-bridge/index.json`, `handoffs.cross-platform`) |

## Dados e efeitos

- Lê o ambiente do processo: `safeEnv` copia `process.env` (`packages/cross-platform/src/env.ts:41`) e `spawnProcess` usa `process.env` quando não recebe `env` (`packages/cross-platform/src/process/spawn.ts:127`).
- Só repassa ao processo filho as variáveis de `SYSTEM_ENV_KEYS` (`packages/cross-platform/src/env.ts:13`, por exemplo `PATH` e `HOME`), mais as indicadas em `inherit`. Essa é a proteção para não vazar segredos.
- Inicia processos e árvores de processos (`killProcessTree`); não faz chamadas de rede.
- Permissões do Deno: falhas de permissão mapeiam para `AK_PLATFORM_PERMISSION_DENIED` (`packages/cross-platform/CONVENTIONS.md:33`).

## Como mexer (para agentes)

- **Comece por:** `packages/cross-platform/CONVENTIONS.md`, `packages/cross-platform/src/index.ts` e `packages/cross-platform/src/process/spawn.ts`. O handoff do índice também cita `apps/docs-next/content/docs/for-agents/cross-platform.mdx`.
- **Raiz de edição do handoff:** `packages/cross-platform` (`.doc-bridge/index.json`, `handoffs.cross-platform`).
- **Invariantes:**
  - O subconjunto `/pure` é seguro para navegador e edge e nunca importa módulos `node:` (`packages/cross-platform/CONVENTIONS.md:19`).
  - `spawnProcess` nunca lança quando o início falha; `exited` é rejeitada (`packages/cross-platform/CONVENTIONS.md:35`).
- **Testes:** `packages/cross-platform/tests/spawn.test.ts` (processos), `tests/env.test.ts` e `tests/env-windows.test.ts` (ambiente), `tests/fs.test.ts` e `tests/fs-windows.test.ts` (arquivos), `tests/rules.test.ts` e `tests/scan.test.ts` (lint), `tests/baseline.test.ts` e `tests/cli.test.ts` (linha de base e CLI), `tests/bun-adapter.test.ts`, `tests/deno-adapter.test.ts` e `tests/node-adapter.test.ts` (adapters), e `tests/package-manifest.test.ts`.
- **Validação:** `pnpm --filter @agentskit/cross-platform test` (executa `vitest run`, `packages/cross-platform/package.json:55`) e `pnpm --filter @agentskit/cross-platform lint` (`tsc --noEmit`, `packages/cross-platform/package.json:58`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Quem revisa:** não identificado nos arquivos auditados; confirmar com o coordenador do repo.

## Decisões e história

ADRs relacionados: [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]]. Histórico recente (`git log --oneline -8 -- packages/cross-platform`, conferido em 2026-10-16):

- `e8d42064 chore: version packages (#1757)`
- `6b56e99b docs: add public JSDoc to tools, skills, mcp and cross-platform (DOC-03) (#1818)`
- `bdd1cf10 chore: share tsup package defaults (#1796)`
- `3eabaf7f feat(cross-platform): add shared testing helpers (#1777)`
- `0743256f chore: version packages (#1753)`
- `fa341bfa chore: version packages (#1699)`
- `7237b47e feat(core): add core rules ratchet gate (#1694)`
- `02ca0b8e chore: version packages`

> [!info]- Detalhe técnico
> - `packages/cross-platform/package.json:1` — manifesto, dependências (`:62`) e scripts (`:55`, `:58`).
> - `packages/cross-platform/src/index.ts:1` — entrada pública (`export * from './pure'` e demais reexports).
> - `packages/cross-platform/src/env.ts:13` — allowlist `SYSTEM_ENV_KEYS`.
> - `packages/cross-platform/src/process/spawn.ts:127` — ambiente padrão do processo.
> - `packages/cross-platform/tests/spawn.test.ts:17` — exemplo de `spawnProcess`.
> - `packages/cross-platform/CONVENTIONS.md:19` — invariantes de `/pure` e de processos.
> - `apps/docs-next/content/docs/for-agents/cross-platform.mdx:1` — handoff documental de agentes.
