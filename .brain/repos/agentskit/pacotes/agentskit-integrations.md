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
fontes: ["agentskit/packages/integrations/package.json", "agentskit/packages/integrations/src/index.ts", "agentskit/packages/integrations/src/contract.ts", "agentskit/packages/integrations/src/config-fields.ts", "agentskit/packages/integrations/src/http.ts"]
npm: "@agentskit/integrations"
tags: [pacote, repo/agentskit]
---

# @agentskit/integrations

> [!tldr] Em linguagem comum
> Descreve serviços externos uma vez, com ações, autenticação e eventos de entrada. Outras camadas transformam essas descrições em ferramentas ou conectores.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-tools]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-net]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./testing`.

Nomes encontrados na entrada de código: `defineIntegration, defineAction, defineTrigger`, `CONFIG_FIELDS`, `httpJson, bindHttp, composeTimeoutSignal, readResponseText`, `createRegistry, registerIntegration, getIntegration, listIntegrations, integrationsByCategory,`, `toToolDefinitions, actionToToolDefinition, httpOptionsFor,`, `integrationTools, integrationToolsFromEnv, credentialEnvVar,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/integrations/package.json:1`.
> - Entrada e composição: `agentskit/packages/integrations/src/index.ts:7`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/integrations/src/contract.ts:218`.
> - Implementação exportada: `agentskit/packages/integrations/src/config-fields.ts:16`.
> - Implementação exportada: `agentskit/packages/integrations/src/http.ts:216`.
