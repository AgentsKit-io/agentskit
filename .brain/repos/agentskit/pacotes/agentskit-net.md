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
fontes: ["agentskit/packages/net/package.json", "agentskit/packages/net/src/index.ts", "agentskit/packages/net/src/errors.ts", "agentskit/packages/net/src/retry.ts", "agentskit/packages/net/src/timeout.ts"]
npm: "@agentskit/net"
tags: [pacote, repo/agentskit]
---

# @agentskit/net

> [!tldr] Em linguagem comum
> Reúne os cuidados das chamadas HTTP: tempo limite, novas tentativas, leitura com tamanho limitado e checagem de endereços. Cada consumidor escolhe quais cuidados ligar.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-adapters]], [[agentskit-cli]], [[agentskit-integrations]], [[agentskit-mcp]], [[agentskit-memory]], [[agentskit-observability]], [[agentskit-rag]], [[agentskit-runtime]], [[agentskit-tools]], [[agentskit-docs-next]], [[chat]], [[chat-server]] |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | `eventsource-parser`, `ipaddr.js` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./rules`.

Nomes encontrados na entrada de código: `NetError, NetErrorCodes, isAbortError`, `RETRYABLE_STATUSES, computeBackoff, isRetryableStatus, parseRetryAfter, retry, sleep`, `anySignal, timeoutSignal, withTimeout`, `fetchWithRetry`, `readBody, readJson, readText`, `parseSSE, parseSSEResponse`, `assertPublicUrl, classifyAddress, isPublicAddress`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê URLs, opções e corpos HTTP; devolve respostas ou erros limitados pela política escolhida.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/net/package.json:1`.
> - Entrada e composição: `agentskit/packages/net/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/net/src/errors.ts:6`.
> - Implementação exportada: `agentskit/packages/net/src/retry.ts:4`.
> - Implementação exportada: `agentskit/packages/net/src/timeout.ts:7`.
