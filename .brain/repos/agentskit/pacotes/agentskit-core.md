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
fontes: ["agentskit/packages/core/package.json", "agentskit/packages/core/src/index.ts", "agentskit/packages/core/src/controller.ts", "agentskit/packages/core/src/errors.ts", "agentskit/packages/core/src/memory.ts", "agentskit-registry/registry/clinical-patient-summary/meta.json", "law-os/apps/law-os/backend/compose.mjs", "law-os/apps/law-os/backend/worker/features.mjs", "law-os/packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml"]
npm: "@agentskit/core"
tags: [pacote, repo/agentskit]
---

# @agentskit/core

> [!tldr] Em linguagem comum
> É a base comum: guarda o estado da conversa e define os encaixes para modelos, ferramentas, memória e busca. As outras peças falam a mesma língua graças a ela.

← [[00 Hub - agentskit]]

## Papel e contratos

| Relação | O que significa aqui |
|---|---|
| Faz parte de | [[00 Hub - agentskit]] |
| Consumidores declarados | [[agentskit-adapters]], [[agentskit-angular]], [[agentskit-cli]], [[agentskit-cross-platform]], [[agentskit-eval]], [[agentskit-eval-braintrust]], [[agentskit-ink]], [[agentskit-integrations]], [[agentskit-mcp]], [[agentskit-memory]], [[agentskit-net]], [[agentskit-observability]], [[agentskit-observability-langfuse]], [[agentskit-rag]], [[agentskit-react]], [[agentskit-react-native]], [[agentskit-runtime]], [[agentskit-sandbox]], [[agentskit-skills]], [[agentskit-solid]], [[agentskit-svelte]], [[agentskit-templates]], [[agentskit-tools]], [[agentskit-validation]], [[agentskit-vue]], [[agentskit-ask-backend]], [[agentskit-docs-next]], [[agentskit-example-discord-bot]], [[agentskit-example-edge]], [[agentskit-example-embedded]], [[agentskit-example-ink]], [[agentskit-example-rag-chat]], [[agentskit-example-react]], [[agentskit-example-runtime]], [[agentskit-example-slack-bot]], [[agentskit-example-teams-bot]], [[agentskit-example-webllm]], [[agentskit-registry]], [[agentskit-visual-react]], [[chat-angular]], [[chat]], [[chat-protocol]], [[chat-server]], [[chat-solid]], [[chat-svelte]], [[chat-docs]], [[chat-example-react]], [[chat-example-shared]], [[chat-example-solid]], [[chat-example-svelte]], [[chat-example-vue]] |
| Depende de peças do ecossistema | Nenhuma dependência de produção/peer entre os workspaces inventariados. |
| Outras dependências diretas/peer | Nenhuma no manifesto. |

O manifesto permite publicação npm; a análise estática não consulta a versão efetivamente publicada.

## O que entrega

Entradas públicas do manifesto: `.`, `./agent-schema`, `./prompt-experiments`, `./auto-summarize`, `./hitl`, `./security`, `./fuzzy-match`, `./finding`, `./compose-tool`, `./self-debug`, `./generative-ui`, `./a2a`, `./manifest`, `./eval-format`, `./memory-validation`, `./tool-proposal`, `./rules`, `./hash`.

Nomes encontrados na entrada de código: `createChatController`, `AgentsKitError, AdapterError, ToolError, MemoryError, ConfigError, RuntimeError, SandboxError, SkillError, ErrorCodes,`, `createInMemoryMemory, createLocalStorageMemory, serializeMessages, deserializeMessages`, `createStaticRetriever, formatRetrievedDocuments`, `createId, generateId, buildMessage, executeToolCall, consumeStream, createEventEmitter, parseToolArgs, safeParseArgs, isRecord, createToolLifecycle,`, `defineTool`, `compileBudget, approximateCounter`, `createProgressiveArgParser, executeToolProgressively`. A lista orienta a navegação; os subpaths acima definem a superfície completa.

## Dados que entram e saem

Lê mensagens, configurações, resultados de ferramentas e trechos recuperados; mantém estado e uso da conversa em memória. Pode hidratar e salvar histórico usando a implementação de ChatMemory fornecida. Não impõe banco externo nem hospedagem.

> [!info]- Detalhe técnico
> - Manifesto e dependências: `agentskit/packages/core/package.json:1`.
> - Entrada e composição: `agentskit/packages/core/src/index.ts:1`.
> - Dependentes acima são calculados dos `dependencies` e `peerDependencies` dos workspaces de agentskit e agentskit-chat, nos commits do hub; não equivalem a uma contagem de adoção em produção.

> [!info]- Onde abrir a implementação
> - Implementação exportada: `agentskit/packages/core/src/controller.ts:27`.
> - Implementação exportada: `agentskit/packages/core/src/errors.ts:30`.
> - Implementação exportada: `agentskit/packages/core/src/memory.ts:8`.

## Consumo declarado no catálogo

[[00 Hub - agentskit-registry]] declara este pacote em 346 metadados de agentes. É vínculo de instalação do código copiado; não prova execução em produção.

> [!info]- Detalhe técnico
> - `agentskit-registry/registry/clinical-patient-summary/meta.json:1` — exemplo de declaração; contagem estática dos 346 meta.json no commit 49952c7.

## No law-os

É o **alicerce do AgentsKit**: os tipos e utilitários básicos que todos os outros pacotes do OSS usam. No backend do law-os, ajuda a **montar as mensagens** enviadas à IA e a ler as chamadas de ferramenta. No front, está só instalado.

| Onde | Papel |
|---|---|
| Backend, [[law-os - Etapa 2 - Triagem]] a [[law-os - Etapa 6 - Redigir parecer]] | Formata as mensagens e as chamadas de ferramenta dentro do despacho de IA (`buildMessage`, `safeParseArgs`), via [[os-runtime-agentskit]] |
| Front | **Instalado, sem uso**: declarado em `package.json`, sem nenhum `import` em `src` |

| Ramo atual | Papel |
|---|---|
| [[law-os - Etapa 6c - Revisar parecer devolvido]] | Nova execução com parecer-reviser; usa o mesmo caminho de execução/IA e retorna à validação antes da aprovação. |

O recorte é o fluxo documentado em [[Revisão de contratos - law-os]]; limitações e módulos opcionais estão em [[Capacidades não usadas]]. A composição atual prevalece sobre o levantamento antigo do piloto.

> [!info]- Evidência do uso no produto
> Law OS `371860a`: `apps/law-os/backend/compose.mjs:139`, `apps/law-os/backend/worker/features.mjs:118`, `apps/law-os/package.json:27`, `apps/law-os/backend/package.json:17` e `packages/pack-fixtures-reference/packs/law/flows/contract-review.yaml:33`. Consulte [[Composição da revisão - law-os]] e as etapas vinculadas para o caminho de cada chamada. Fontes da plataforma referem-se à revisão genérica do frontmatter, que não é prova da versão implantada do tier rc.20.
