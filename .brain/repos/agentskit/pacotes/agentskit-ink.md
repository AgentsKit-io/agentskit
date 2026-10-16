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
fontes: ["agentskit/packages/ink/package.json", "agentskit/packages/ink/src/index.ts", "agentskit/packages/ink/src/useChat.ts", "agentskit/packages/ink/src/progress-observer.ts", "agentskit/packages/ink/src/components/index.ts"]
npm: "@agentskit/ink"
tags: [pacote, repo/agentskit]
---

# @agentskit/ink

> [!tldr] Em linguagem comum
> Liga o controlador comum de conversa à interface de terminal com Ink. Entrega componentes e acesso ao estado sem criar outro motor de agente.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-example-ink]], [[chat]], [[chat-ink]], [[chat-example-ink]] |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | `ink`, `marked`, `marked-terminal`, `react` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `createChatController`, `createInMemoryMemory`, `createLocalStorageMemory`, `createStaticRetriever`, `formatRetrievedDocuments`, `useChat`, `createProgressObserver`, `SPINNER_FRAMES`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê e apresenta mensagens e eventos; o estado, ferramentas e persistência vêm da sessão/controlador e das opções do hospedeiro.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/ink/package.json:1`.
> - Entrada e composição: `agentskit/packages/ink/src/index.ts:5`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/ink/src/useChat.ts:20`.
> - Implementação exportada: `agentskit/packages/ink/src/progress-observer.ts:15`.
> - Implementação exportada: `agentskit/packages/ink/src/components/index.ts:1`.
