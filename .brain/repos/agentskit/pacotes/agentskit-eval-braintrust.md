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
fontes: ["agentskit/packages/eval-braintrust/package.json", "agentskit/packages/eval-braintrust/src/index.ts", "agentskit/packages/eval-braintrust/src/types.ts", "agentskit/packages/eval-braintrust/src/runner.ts", "agentskit/packages/eval-braintrust/src/scorers/index.ts"]
tags: [pacote, repo/agentskit]
---

# @agentskit/eval-braintrust

> [!tldr] Em linguagem comum
> Dá notas de qualidade e resistência a falhas aos resultados de agentes e identifica regressões. O envio de experimentos ao Braintrust é opcional.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | Nenhum outro workspace destes dois repos o declara como dependência de produção ou peer; uso externo não foi inventariado. |
| Depende de peças do ecossistema | [[agentskit-core]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

Workspace interno (`private: true`), com código público no repositório. Isso não significa repositório privado.
A API pública é consolidada em `@agentskit/eval/braintrust`.

## O que entrega

Entradas públicas do manifesto: `.`, `./scorers`, `./ci`.

Nomes encontrados na entrada de código: `scoreCase, summarize, runBraintrustEval,`, `qualityFamily, robustnessFamily, ALL_SCORERS, taskSuccess, factualGrounding, citationCorrectness, toolArgValidity, schemaSurvival, hitlGateCorrectness, fallbackResilience, noCrashS`, `detectRegressions, formatAlertsMarkdown`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/eval-braintrust/package.json:1`.
> - Entrada e composição: `agentskit/packages/eval-braintrust/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/eval-braintrust/src/types.ts:1`.
> - Implementação exportada: `agentskit/packages/eval-braintrust/src/runner.ts:145`.
> - Implementação exportada: `agentskit/packages/eval-braintrust/src/scorers/index.ts:36`.
