---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/cross-platform/package.json", "agentskit/packages/cross-platform/src/index.ts", "agentskit/packages/cross-platform/src/pure.ts", "agentskit/packages/cross-platform/src/errors.ts", "agentskit/packages/cross-platform/src/env.ts"]
npm: "@agentskit/cross-platform"
tags: [pacote, repo/agentskit]
---

# @agentskit/cross-platform

> [!tldr] Em linguagem comum
> Faz comandos, caminhos e arquivos se comportarem de forma previsível no Windows, macOS e Linux, usando Node, Bun ou Deno.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-adapters]], [[agentskit-cli]], [[agentskit-eval]], [[agentskit-sandbox]], [[agentskit-tools]], [[agentskit-docs-next]], [[chat-cli]], [[chat-docs]] |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | `cross-spawn`, `graceful-fs`, `pathe`, `tree-kill`, `which` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./pure`, `./testing`.

Nomes encontrados na entrada de código: `CrossPlatformError, CrossPlatformErrorCodes, isNotFoundError, isPermissionError, mapRuntimeError, permissionDenied,`, `SYSTEM_ENV_KEYS, getEnv, homeDir, safeEnv, tempDir`, `fileUrlToPath, isMainModule, moduleDir, pathToFileUrl`, `copyPath, createSymlink, removePath, renamePath, setFileMode, writeFileAtomic`, `spawnProcess, spawnShell, selectAdapter`, `spawnNodeChild`, `runCommand, runShell`, `killProcessTree`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê ambiente e sistema de arquivos; pode criar processos e alterar arquivos quando o consumidor chama essas operações.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/cross-platform/package.json:1`.
> - Entrada e composição: `agentskit/packages/cross-platform/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/cross-platform/src/pure.ts:1`.
> - Implementação exportada: `agentskit/packages/cross-platform/src/errors.ts:6`.
> - Implementação exportada: `agentskit/packages/cross-platform/src/env.ts:13`.
