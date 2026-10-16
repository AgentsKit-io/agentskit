---
tipo: pacote
repo: agentskit
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  law-os: 371860a
  agentskit: 779aa601
  agentskit-chat: 8aeeffd
  agentskit-registry: 49952c7
metodo: análise estática; nada foi executado
fontes: ["agentskit/packages/runtime/package.json", "agentskit/packages/runtime/src/index.ts", "agentskit/packages/runtime/src/runner.ts", "agentskit/packages/runtime/src/structured.ts", "agentskit/packages/runtime/src/pii-validator.ts", "agentskit-registry/registry/clinical-patient-summary/meta.json", "law-os/apps/law-os/backend/compose.mjs", "law-os/apps/law-os/backend/worker/features.mjs", "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"]
npm: "@agentskit/runtime"
tags: [pacote, repo/agentskit]
---

# @agentskit/runtime

> [!tldr] Em linguagem comum
> Executa um agente sem depender de uma tela: ele consulta a IA, usa ferramentas e repete até terminar ou atingir o limite. Também oferece delegação, fluxos e retomada de trabalho.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-mcp]], [[agentskit-docs-next]], [[agentskit-example-discord-bot]], [[agentskit-example-embedded]], [[agentskit-example-flow]], [[agentskit-example-runtime]], [[agentskit-example-slack-bot]], [[agentskit-example-teams-bot]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-net]] |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./shared-context`.

Nomes encontrados na entrada de código: `createRuntime`, `invokeStructured`, `piiDenyValidator`, `createSharedContext`, `createDurableRunner, createInMemoryStepLog, createFileStepLog,`, `supervisor, swarm, hierarchical, blackboard,`, `DEFAULT_TOPOLOGY_CONCURRENCY, InMemoryScratchpadStore, resolveConcurrency, settleWithConcurrency,`, `createCompareHandler`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Recebe objetos de configuração e dados de execução; devolve contratos e resultados. A entrada citada abaixo permite localizar as implementações; retenção externa depende do consumidor.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/runtime/package.json:1`.
> - Entrada e composição: `agentskit/packages/runtime/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/runtime/src/runner.ts:96`.
> - Implementação exportada: `agentskit/packages/runtime/src/structured.ts:22`.
> - Implementação exportada: `agentskit/packages/runtime/src/pii-validator.ts:18`.

## Consumo declarado no catálogo

[[00 Hub - agentskit-registry]] declara este pacote em 346 metadados de agentes. É vínculo de instalação do código copiado; não prova execução em produção.

> [!info]- Detalhe técnico
> - `agentskit-registry/registry/clinical-patient-summary/meta.json:1` — exemplo de declaração; contagem estática dos 346 meta.json no commit 49952c7.

## No law-os

É dependência declarada no backend. Não há nó multiagente no grafo desta revisão; não confundir quatro agentes em passos distintos com compare/vote/debate/auction, nem deduzir ausência global de uso da biblioteca.

| Momento | Uso no produto |
|---|---|
| Antes / fora da execução | Papel descrito acima; composição não implica chamada em cada run. |
| [[Revisão de contratos - law-os]] | Não há etapa dedicada demonstrada para este pacote; veja a composição e os limites acima. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.
