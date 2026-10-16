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
fontes: ["agentskit/packages/observability/package.json", "agentskit/packages/observability/src/index.ts", "agentskit/packages/observability/src/console-logger.ts", "agentskit/packages/observability/src/redaction.ts", "agentskit/packages/observability/src/langsmith.ts", "law-os/apps/law-os/backend/compose.mjs", "law-os/apps/law-os/backend/worker/features.mjs", "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"]
npm: "@agentskit/observability"
tags: [pacote, repo/agentskit]
---

# @agentskit/observability

> [!tldr] Em linguagem comum
> Registra o que aconteceu na execução e ajuda a acompanhar custo, tempo e falhas. O destino dos registros depende dos observadores ligados pela aplicação.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-observability-langfuse]], [[agentskit-docs-next]], [[chat]], [[chat-server]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-net]] |
| Outras dependências diretas/peer | `@opentelemetry/api`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/sdk-trace-base`, `drizzle-orm`, `langfuse`, `langsmith`, `pg` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./trace-tracker`, `./cost-guard`, `./postgres`, `./cost-store-contract`, `./langfuse`.

Nomes encontrados na entrada de código: `consoleLogger`, `wrapObserverWithRedaction`, `langsmith`, `datadogSink`, `axiomSink`, `newRelicSink`, `opentelemetry`, `createTraceTracker`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê eventos, uso de tokens e duração; envia ou persiste rastros e custos conforme o sink/store configurado.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/observability/package.json:1`.
> - Entrada e composição: `agentskit/packages/observability/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/observability/src/console-logger.ts:85`.
> - Implementação exportada: `agentskit/packages/observability/src/redaction.ts:148`.
> - Implementação exportada: `agentskit/packages/observability/src/langsmith.ts:56`.

## No law-os

Primitivas OSS de observabilidade podem chegar pela composição da plataforma. Não há uma etapa de replay no grafo atual da revisão; coletor e destino de produção não foram consultados.

| Momento | Uso no produto |
|---|---|
| Antes / fora da execução | Papel descrito acima; composição não implica chamada em cada run. |
| [[Revisão de contratos - law-os]] | Não há etapa dedicada demonstrada para este pacote; veja a composição e os limites acima. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.
