---
tipo: pacote
repo: agentskit
grupo: Provedores e ferramentas
npm: "@agentskit/sandbox"
camada: framework
visibilidade: publico
verificado-em: 2026-10-16
commits: { agentskit: 9f8d8551 }
metodo: "leitura do código e do índice .doc-bridge/index.json existente; CLI não executada (pnpm indisponível); busca de consumidores e de variáveis de ambiente por git grep; auditado em 2026-10-16"
fontes: ["packages/sandbox/package.json", "packages/sandbox/src/index.ts", "packages/sandbox/src/container-runtimes.ts", "packages/sandbox/README.md", "apps/docs-next/content/docs/for-agents/sandbox.mdx", "AGENTS.md", "packages/sandbox/CONVENTIONS.md", "packages/sandbox/tests/sandbox.test.ts", "packages/sandbox/tests/policy.test.ts", "packages/sandbox/tests/e2b-backend.test.ts", "packages/sandbox/tests/local-registry.test.ts", "docs/architecture/adrs/0002-tool-contract.md", "docs/architecture/adrs/0006-runtime-contract.md", "docs/architecture/adrs/0009-composition-rules.md"]
tags: [pacote, repo/agentskit, camada/framework, grupo/provedores-e-ferramentas]
---

# agentskit-sandbox

> [!tldr] Em linguagem comum
> Executa código não confiável (gerado pelo modelo) fora do processo principal: em uma VM na nuvem (E2B), em um processo local com nível de isolamento declarado, ou em contêiner (bwrap, Docker). Está em beta e não deve ser tratado como isolamento multi-inquilino.

← [[00 Grupo - agentskit - Provedores e ferramentas]]

## O que faz e por que existe

O pacote `@agentskit/sandbox` oferece `createSandbox` para executar código com resultado `{ stdout, stderr, exitCode, durationMs }`, e `sandboxTool` como ferramenta pronta `code_execution` (`packages/sandbox/CONVENTIONS.md:9-13`). Os backends são o E2B (`createE2BBackend`), o Web Worker (subcaminho `./web`, só isolamento de thread e DOM) e os runtimes locais (`none`, `process`, `sandbox-exec`, `bwrap`, `docker`) (`CONVENTIONS.md:7`, `:15-16`; `packages/sandbox/src/index.ts:18-58`). `createMandatorySandbox` aplica política de permitir, negar ou exigir sandbox (`src/index.ts:11-16`).

## API e contratos

Exports de `packages/sandbox/src/index.ts` (linhas verificadas no commit `9f8d8551`):

| Símbolo | Tipo | Para que serve | Onde |
|---|---|---|---|
| `createSandbox` (+ `Sandbox`, `SandboxConfig`) | função e tipos | Fábrica do sandbox; recebe `backend` ou `apiKey` | `src/index.ts:1-2` (`src/sandbox.ts`) |
| `sandboxTool` | função | Ferramenta `code_execution` pronta | `src/index.ts:4` (`src/tool.ts`) |
| `createE2BBackend` (+ `E2BConfig`) | função e tipo | Backend de VM na nuvem E2B | `src/index.ts:6-7` |
| `SandboxBackend`, `ExecuteOptions`, `ExecuteResult` | tipos | Contrato de backend (`execute` e `dispose` opcional) | `src/index.ts:9` |
| `createMandatorySandbox` (+ `SandboxPolicy`, `PolicyEvent`, `MandatorySandboxWrapper`) | função e tipos | Política allow/deny/requireSandbox | `src/index.ts:11-16` (`src/policy.ts`) |
| `SANDBOX_LEVELS` (+ `SandboxLevel`, `SandboxRuntime`, `SandboxExecOptions`, `SandboxExecResult`, `Spawner`, `ChildHandle`, `SpawnerExecOptions`, `SpawnerExecResult`) | constante e tipos | Níveis de isolamento e contrato dos runtimes locais | `src/index.ts:21-31` |
| `nodeSpawner` | função | Executa processo filho com Node | `src/index.ts:32` |
| `noneSandbox`, `processSandbox`, `exposeAllowedEnvKeys`, `sandboxExecRuntime`, `renderSandboxExecProfile` (+ tipos) | funções e tipos | Runtimes locais e perfil de `sandbox-exec` | `src/index.ts:33-44` |
| `bwrapRuntime`, `renderBwrapArgs`, `isBwrapSupported`, `getBwrapPath`, `dockerRuntime`, `renderDockerArgs` (+ tipos) | funções e tipos | Runtimes em contêiner (bwrap e Docker) | `src/index.ts:45-58` (`src/container-runtimes.ts`) |
| `SandboxRegistry`, `isStrongIsolation`, `isWeakIsolation`, `assertStrongIsolation`, `weakSandboxBanner`, `WeakSandboxError` | classe, funções e erro | Registro de runtimes e checagem de isolamento forte | `src/index.ts:59-66` (`src/local-registry.ts`) |

Subcaminhos publicados (`packages/sandbox/package.json:36-51`): `./sandbox`, `./types` e `./web`.

Exemplo real (README do pacote, `packages/sandbox/README.md:56`):

```ts
import { sandboxTool } from '@agentskit/sandbox'
```

## Quem usa e do que depende

| Relação | Nota / evidência |
|---|---|
| Dependências internas | [[agentskit-core]] e [[agentskit-cross-platform]] (`packages/sandbox/package.json:67-70`) |
| Peer opcional | `@e2b/code-interpreter` ^2.6.1, opcional (`packages/sandbox/package.json:71-78`) |
| Consumidores dentro do repo | `apps/docs-next` (busca em `packages` e `apps`, commit `9f8d8551`). Nenhum pacote do repositório declara `@agentskit/sandbox`. |
| Documentação para agentes | `apps/docs-next/content/docs/for-agents/sandbox.mdx` (`.doc-bridge/index.json`, `handoffs.sandbox`) |
| Consumidores fora do repo | Não confirmado nesta auditoria. |

## Dados e efeitos

- Variáveis de ambiente: `packages/sandbox/src/container-runtimes.ts:62` lê `PATH` (`process.env.PATH`). O backend E2B recebe a chave por configuração (`apiKey`, `CONVENTIONS.md:11`); o código não lê uma variável de chave do E2B.
- Processos: os runtimes locais criam processos filhos (`nodeSpawner`, `local-spawner.ts`; `bwrap` e `docker`, `container-runtimes.ts`). O ambiente do filho deve ser restrito por lista explícita (`exposeAllowedEnvKeys`, `CONVENTIONS.md:23`, `:45`).
- Rede: `network: false` é o padrão e vira `allowInternetAccess: false` no E2B (`CONVENTIONS.md:20`).
- Limites: tempo de parede por `execute` e teto de bytes para stdout + stderr. `memoryLimit` só é dica para backend próprio, não é aplicado pelo E2B nem pelo Web Worker (`CONVENTIONS.md:22`).

## Como mexer (para agentes)

- **Comece por:** `packages/sandbox/src/sandbox.ts` (fábrica), `packages/sandbox/src/policy.ts` (política obrigatória), `packages/sandbox/src/local-runtimes.ts` e `packages/sandbox/src/container-runtimes.ts`, e `packages/sandbox/CONVENTIONS.md`.
- **Raiz de edição do handoff:** `packages/sandbox` (`.doc-bridge/index.json`, `handoffs.sandbox`).
- **Invariantes** (`packages/sandbox/CONVENTIONS.md:18-25`):
  - Negar rede por padrão (`network: false`).
  - Nunca expor chaves de API ou variáveis de ambiente do host ao código isolado; passar só o necessário.
  - `requireSandbox` delega os argumentos a `sandbox.execute` e não executa o corpo original da ferramenta.
  - Web Worker não é isolamento multi-inquilino.
  - Sem afirmação de estável ou 1.0 sem os critérios da ADR 0024 (`CONVENTIONS.md:59`).
- **Testes:** `packages/sandbox/tests/` (14 arquivos): `sandbox.test.ts`, `policy.test.ts`, `e2b-backend.test.ts`, `container-runtimes.test.ts`, `local-runtimes.test.ts`, `local-spawner.test.ts`, `local-registry.test.ts`, `web-worker-backend.test.ts`, `sandbox-lazy.test.ts`, entre outros. A integração com E2B real fica atrás de uma variável de ambiente de CI (`CONVENTIONS.md:39`).
- **Validação do pacote:** `pnpm --filter @agentskit/sandbox test` (`packages/sandbox/package.json:62`, `vitest run`) e `pnpm --filter @agentskit/sandbox lint` (`:64`, `tsc --noEmit`). Cobertura de linhas: 85% (`CONVENTIONS.md:54`). Não executados nesta auditoria: `pnpm` não está instalado no ambiente.
- **Armadilhas** (`CONVENTIONS.md:43-50`): vazar variáveis de ambiente do host para o sandbox; confiar no Web Worker para multi-inquilino; prometer `memoryLimit` no E2B; tratar todo erro `@e2b` como pacote ausente (só módulo não encontrado vira `AK_SANDBOX_PEER_MISSING`); deixar sessão longa sem `dispose`.

## Decisões e história

ADRs que afetam este pacote: [[agentskit ADR-0002 - Contrato de ferramenta]], [[agentskit ADR-0006 - Contrato de runtime]] (o runner do agente cria processos pelo runtime), [[agentskit ADR-0009 - Regras de composição e dependência]], [[agentskit ADR-0031 - Fronteira compartilhada de execução de adapters CLI]] e [[agentskit ADR-0036 - Um pacote cuida da portabilidade de SO e runtime]].

Histórico recente (`git log --oneline -15 -- packages/sandbox`, listado na versão anterior e não refeito nesta auditoria):

- `e8d42064 chore: version packages (#1757)`
- `7ac9ad94 docs: add public JSDoc across packages (DOC-03 combined) (#1813)`
- `76d56aa1 fix(sandbox): defer cross-platform spawner import (#1695)`

> [!bug] Existe, mas ninguém usa
> Nenhum pacote de `packages/` declara o `@agentskit/sandbox`; só `apps/docs-next` o declara (busca em `packages` e `apps`, commit `9f8d8551`). A versão anterior desta nota dizia que o law-os o usa (`apps/law-os/backend/package.json:17`); essa afirmação depende de repositório que não está neste vault e foi retirada até confirmação.

> [!info]- Detalhe técnico
> - `packages/sandbox/package.json:1` — manifesto, versão, subcaminhos, peer opcional e scripts.
> - `packages/sandbox/src/index.ts:1` — entrada pública.
> - `packages/sandbox/src/container-runtimes.ts:62` — leitura de `PATH`.
> - `apps/docs-next/content/docs/for-agents/sandbox.mdx:1` — handoff documental de agentes.
> - `packages/sandbox/CONVENTIONS.md:1` — postura de segurança e invariantes.
