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
fontes: ["agentskit/packages/observability-langfuse/package.json", "agentskit/packages/observability-langfuse/src/index.ts", "agentskit/packages/observability-langfuse/src/langfuse.ts"]
tags: [pacote, repo/agentskit]
---

# @agentskit/observability-langfuse

> [!tldr] Em linguagem comum
> Converte eventos de execução em rastros no Langfuse, para acompanhar chamadas de modelo e ferramentas.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | Nenhum outro workspace destes dois repos o declara como dependência de produção ou peer; uso externo não foi inventariado. |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-observability]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

Workspace interno (`private: true`), com código público no repositório. Isso não significa repositório privado.
A API pública é consolidada em `@agentskit/observability/langfuse`.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `langfuse`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/observability-langfuse/package.json:1`.
> - Entrada e composição: `agentskit/packages/observability-langfuse/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/observability-langfuse/src/langfuse.ts:31`.
