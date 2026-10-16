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
fontes: ["agentskit/packages/react/package.json", "agentskit/packages/react/src/index.ts", "agentskit/packages/react/src/useStream.ts", "agentskit/packages/react/src/useReactive.ts", "agentskit/packages/react/src/useChat.ts"]
npm: "@agentskit/react"
tags: [pacote, repo/agentskit]
---

# @agentskit/react

> [!tldr] Em linguagem comum
> Liga o controlador comum de conversa à interface em React. Entrega componentes e acesso ao estado sem criar outro motor de agente.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-docs-next]], [[agentskit-example-multi-agent]], [[agentskit-example-rag-chat]], [[agentskit-example-react]], [[agentskit-example-webllm]], [[agentskit-registry]], [[agentskit-visual-react]], [[chat]], [[chat-react]], [[chat-docs]], [[chat-example-react]] |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | `react`, `react-dom` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./theme`.

Nomes encontrados na entrada de código: `createChatController`, `createInMemoryMemory`, `createLocalStorageMemory`, `createStaticRetriever`, `formatRetrievedDocuments`, `useStream`, `useReactive`, `useChat`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê e apresenta mensagens e eventos; o estado, ferramentas e persistência vêm da sessão/controlador e das opções do hospedeiro.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/react/package.json:1`.
> - Entrada e composição: `agentskit/packages/react/src/index.ts:7`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/react/src/useStream.ts:16`.
> - Implementação exportada: `agentskit/packages/react/src/useReactive.ts:14`.
> - Implementação exportada: `agentskit/packages/react/src/useChat.ts:20`.
