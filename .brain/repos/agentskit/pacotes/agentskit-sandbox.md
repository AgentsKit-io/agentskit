---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  law-os: 371860a
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/sandbox/package.json", "agentskit/packages/sandbox/src/index.ts", "agentskit/packages/sandbox/src/sandbox.ts", "agentskit/packages/sandbox/src/tool.ts", "agentskit/packages/sandbox/src/e2b-backend.ts", "law-os/apps/law-os/backend/compose.mjs", "law-os/apps/law-os/backend/worker/features.mjs", "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"]
npm: "@agentskit/sandbox"
tags: [pacote, repo/agentskit]
---

# @agentskit/sandbox

> [!tldr] Em linguagem comum
> Oferece maneiras de executar código com limites, em processos locais ou no serviço E2B. A proteção efetiva depende do backend e da política escolhidos.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-docs-next]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-cross-platform]] |
| Outras dependências diretas/peer | `@e2b/code-interpreter` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./sandbox`, `./types`, `./web`.

Nomes encontrados na entrada de código: `createSandbox`, `sandboxTool`, `createE2BBackend`, `createMandatorySandbox`, `SANDBOX_LEVELS`, `nodeSpawner`, `noneSandbox, processSandbox, exposeAllowedEnvKeys, sandboxExecRuntime, renderSandboxExecProfile,`, `bwrapRuntime, renderBwrapArgs, isBwrapSupported, getBwrapPath, dockerRuntime, renderDockerArgs,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe código e opções de execução; devolve saída, erro e estado de término. Arquivos, rede e variáveis disponíveis dependem do backend.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/sandbox/package.json:1`.
> - Entrada e composição: `agentskit/packages/sandbox/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/sandbox/src/sandbox.ts:62`.
> - Implementação exportada: `agentskit/packages/sandbox/src/tool.ts:26`.
> - Implementação exportada: `agentskit/packages/sandbox/src/e2b-backend.ts:59`.

## No law-os

É dependência declarada no backend. A presença no manifesto não prova isolamento ativo das ferramentas; o caminho de sandbox do host deve ser lido em [[os-sandbox]].

| Momento | Uso no produto |
|---|---|
| Antes / fora da execução | Papel descrito acima; composição não implica chamada em cada run. |
| [[Revisão de contratos - law-os]] | Não há etapa dedicada demonstrada para este pacote; veja a composição e os limites acima. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.
