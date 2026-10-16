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
fontes: ["agentskit/packages/skills/package.json", "agentskit/packages/skills/src/index.ts", "agentskit/packages/skills/src/researcher.ts", "agentskit/packages/skills/src/coder.ts", "agentskit/packages/skills/src/planner.ts", "agentskit-registry/registry/research/meta.json"]
npm: "@agentskit/skills"
tags: [pacote, repo/agentskit]
---

# @agentskit/skills

> [!tldr] Em linguagem comum
> É uma coleção de instruções de comportamento prontas, como pesquisar, programar e revisar. Uma instrução orienta o agente; não executa a tarefa sozinha.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-docs-next]], [[agentskit-example-multi-agent]], [[agentskit-example-runtime]] |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`.

Nomes encontrados na entrada de código: `researcher`, `coder`, `planner`, `critic`, `summarizer`, `codeReviewer`, `prReviewer`, `sqlGen`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/skills/package.json:1`.
> - Entrada e composição: `agentskit/packages/skills/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/skills/src/researcher.ts:5`.
> - Implementação exportada: `agentskit/packages/skills/src/coder.ts:5`.
> - Implementação exportada: `agentskit/packages/skills/src/planner.ts:5`.

## Consumo declarado no catálogo

[[00 Hub - agentskit-registry]] declara este pacote em 1 metadados de agentes. É vínculo de instalação do código copiado; não prova execução em produção.

> [!info]- Detalhe técnico
> - `agentskit-registry/registry/research/meta.json:1` — exemplo de declaração; contagem estática dos 346 meta.json no commit 49952c7.
