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
fontes: ["agentskit/packages/mcp/package.json", "agentskit/packages/mcp/src/index.ts", "agentskit/packages/mcp/src/validation.ts", "agentskit/packages/mcp/src/agent-tool.ts", "agentskit/packages/mcp/src/registry-fetch.ts"]
npm: "@agentskit/mcp"
tags: [pacote, repo/agentskit]
---

# @agentskit/mcp

> [!tldr] Em linguagem comum
> Expõe ferramentas do AgentsKit para programas que falam MCP. Oferece uma ponte de ferramentas por entrada e saída padrão, com autorização para ações que exigem confirmação.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | Nenhum outro workspace destes dois repos o declara como dependência de produção ou peer; uso externo não foi inventariado. |
| Depende de peças do ecossistema | [[agentskit-adapters]], [[agentskit-core]], [[agentskit-net]], [[agentskit-runtime]], [[agentskit-tools]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `processStdio`, `createAgentsKitMcpServer`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/mcp/package.json:1`.
> - Entrada e composição: `agentskit/packages/mcp/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/mcp/src/validation.ts:9`.
> - Implementação exportada: `agentskit/packages/mcp/src/agent-tool.ts:44`.
> - Implementação exportada: `agentskit/packages/mcp/src/registry-fetch.ts:142`.
