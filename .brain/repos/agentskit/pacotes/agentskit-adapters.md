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
fontes: ["agentskit/packages/adapters/package.json", "agentskit/packages/adapters/src/index.ts", "agentskit/packages/adapters/src/createAdapter.ts", "agentskit/packages/adapters/src/generic.ts", "agentskit/packages/adapters/src/anthropic.ts", "law-os/apps/law-os/backend/compose.mjs", "law-os/apps/law-os/backend/worker/features.mjs", "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"]
npm: "@agentskit/adapters"
tags: [pacote, repo/agentskit]
---

# @agentskit/adapters

> [!tldr] Em linguagem comum
> Traduz o pedido do agente para a API de cada provedor de IA e transforma a resposta em um formato comum. Assim, trocar de provedor não exige reescrever o agente.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-cli]], [[agentskit-mcp]], [[agentskit-ask-backend]], [[agentskit-docs-next]], [[agentskit-example-edge]], [[agentskit-example-embedded]], [[agentskit-example-rag-chat]], [[agentskit-example-react]], [[agentskit-example-webllm]] |
| Depende de peças do ecossistema | [[agentskit-core]], [[agentskit-cross-platform]], [[agentskit-net]] |
| Outras dependências diretas/peer | `@aws-sdk/client-bedrock-runtime`, `@langchain/core`, `@mlc-ai/web-llm` |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./createAdapter`, `./catalog`, `./cli`, `./langchain-bridge`.

Nomes encontrados na entrada de código: `createAdapter`, `generic`, `anthropic`, `openai`, `gemini`, `grok`, `ollama`, `deepseek`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Envia mensagens e definições de ferramentas ao provedor configurado; lê texto, chamadas de ferramentas e uso de tokens.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/adapters/package.json:1`.
> - Entrada e composição: `agentskit/packages/adapters/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/adapters/src/createAdapter.ts:10`.
> - Implementação exportada: `agentskit/packages/adapters/src/generic.ts:10`.
> - Implementação exportada: `agentskit/packages/adapters/src/anthropic.ts:25`.

## No law-os

Atende as chamadas ao provedor selecionado pelo host, via [[os-runtime-agentskit]]. Inclui redação, reparo e revisão do parecer, além da análise inicial; o modelo efetivo por papel depende da instalação.

| Etapa | O que faz |
|---|---|
| [[law-os - Etapa 2 - Triagem]] · [[law-os - Etapa 3 - Extrair cláusulas]] · [[law-os - Etapa 5 - Analisar riscos]] · [[law-os - Etapa 6 - Redigir parecer]] | Envia o prompt montado pelo [[os-runtime]] ao provedor ativo e devolve a resposta |
| Etapas 1, 4, 7, 8 | **Não atua.** São código ou humano |

| Ramo atual | Papel |
|---|---|
| [[law-os - Etapa 6c - Revisar parecer devolvido]] | Nova execução com parecer-reviser; usa o mesmo caminho de execução/IA e retorna à validação antes da aprovação. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.
