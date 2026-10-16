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
fontes: ["agentskit/packages/eval/package.json", "agentskit/packages/eval/src/index.ts", "agentskit/packages/eval/src/runner.ts", "agentskit/packages/eval/src/types.ts"]
npm: "@agentskit/eval"
tags: [pacote, repo/agentskit]
---

# @agentskit/eval

> [!tldr] Em linguagem comum
> Compara o resultado de um agente com casos de avaliação e oferece reprodução de respostas gravadas, para investigar mudanças sem repetir chamadas pagas.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-docs-next]], [[agentskit-example-dspy]], [[chat]], [[chat-devtools]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-cross-platform]] |
| Outras dependências diretas/peer | `braintrust` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./replay`, `./replay/io`, `./snapshot`, `./diff`, `./ci`, `./braintrust`, `./braintrust/scorers`, `./braintrust/ci`, `./provenance`.

Nomes encontrados na entrada de código: `runEval`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/eval/package.json:1`.
> - Entrada e composição: `agentskit/packages/eval/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/eval/src/runner.ts:98`.
> - Implementação exportada: `agentskit/packages/eval/src/types.ts:1`.
