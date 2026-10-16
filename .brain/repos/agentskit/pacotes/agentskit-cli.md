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
fontes: ["agentskit/packages/cli/package.json", "agentskit/packages/cli/src/index.ts", "agentskit/packages/cli/src/commands.ts", "agentskit/packages/cli/src/config.ts", "agentskit/packages/cli/src/chat.tsx"]
npm: "@agentskit/cli"
tags: [pacote, repo/agentskit]
---

# @agentskit/cli

> [!tldr] Em linguagem comum
> É a porta de entrada no terminal para criar projetos, conversar, executar agentes e copiar agentes do Registry para o código do usuário.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | Nenhum outro workspace destes dois repos o declara como dependência de produção ou peer; uso externo não foi inventariado. |
| Depende de peças do ecossistema | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-ink]], [[agentskit-integrations]], [[agentskit-memory]], [[agentskit-net]], [[agentskit-rag]], [[agentskit-runtime]], [[agentskit-skills]], [[agentskit-tools]] |
| Outras dependências diretas/peer | `@inquirer/prompts`, `chokidar`, `commander`, `ink`, `kleur`, `localtunnel`, `react`, `tsx`, `yaml` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `createCli`, `loadConfig`, `ChatApp, renderChatHeader`, `writeStarterProject`, `resolveChatProvider`, `runAgent`, `runDoctor, renderReport`, `startDev`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê configuração, argumentos e agentes remotos; pode criar arquivos de projeto, sessões e cópias locais de agentes.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/cli/package.json:1`.
> - Entrada e composição: `agentskit/packages/cli/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/cli/src/commands.ts:1`.
> - Implementação exportada: `agentskit/packages/cli/src/config.ts:176`.
> - Implementação exportada: `agentskit/packages/cli/src/chat.tsx:1`.
