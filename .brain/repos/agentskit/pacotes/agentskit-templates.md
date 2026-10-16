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
fontes: ["agentskit/packages/templates/package.json", "agentskit/packages/templates/src/index.ts", "agentskit/packages/templates/src/factories.ts", "agentskit/packages/templates/src/scaffold.ts", "agentskit/packages/templates/src/validate.ts"]
npm: "@agentskit/templates"
tags: [pacote, repo/agentskit]
---

# @agentskit/templates

> [!tldr] Em linguagem comum
> Ajuda quem cria novas ferramentas, instruções e adaptadores a começar com uma estrutura consistente e validá-la.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | Nenhum outro workspace destes dois repos o declara como dependência de produção ou peer; uso externo não foi inventariado. |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `createToolTemplate, createSkillTemplate, createAdapterTemplate,`, `scaffold, SCAFFOLD_TYPES, validateScaffoldConfig,`, `validateToolTemplate, validateSkillTemplate, validateAdapterTemplate,`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/templates/package.json:1`.
> - Entrada e composição: `agentskit/packages/templates/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/templates/src/factories.ts:37`.
> - Implementação exportada: `agentskit/packages/templates/src/scaffold.ts:62`.
> - Implementação exportada: `agentskit/packages/templates/src/validate.ts:30`.
