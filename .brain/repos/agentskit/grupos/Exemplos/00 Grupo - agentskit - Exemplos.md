---
tipo: grupo
repo: agentskit
grupo: Exemplos
camada: ferramenta
visibilidade: publico
verificado-em: 2026-10-16
commits:
  agentskit: 9f8d8551
metodo: "inspeção estática; .doc-bridge/index.json versionado consultado; pnpm ausente, índice não atualizado; auditado em 2026-10-16"
fontes:
  - "apps/example-react/package.json"
  - "apps/example-runtime/package.json"
  - "apps/example-edge/package.json"
tags: [grupo, repo/agentskit, grupo/exemplos, camada/ferramenta]
---

# 00 Grupo - agentskit - Exemplos

> [!tldr] Em linguagem comum
> Aplicações pequenas que demonstram como compor pacotes AgentsKit em hosts e tarefas distintas. Alguns são demos com mocks; leia a nota antes de tratar comportamento ilustrativo como integração real.

← [[00 Hub - agentskit]]

## Para que existe e quem usa

Este grupo organiza as superfícies exemplos do monorepo. Consulte cada app para contratos observáveis, efeitos e comandos.

## Partes e fluxos

| Nota | Papel (verificado no README e no entry do exemplo) |
|---|---|
| [[agentskit-example-discord-bot]] | Bot de Discord de referência, com `createChatTrigger` do runtime. Tem testes. |
| [[agentskit-example-dspy]] | Prompt base contra prompt otimizado por DSPy, pontuados pelo `@agentskit/eval`. |
| [[agentskit-example-edge]] | Worker de Cloudflare com `POST /chat`, no caminho quente pequeno. |
| [[agentskit-example-embedded]] | O mesmo agente em CLI Node, Raycast e tarefa do VS Code. |
| [[agentskit-example-embedded-raycast]] | Host do Raycast do exemplo embedded (script Node próprio). |
| [[agentskit-example-flow]] | Demo de `compileFlow` com fluxo em YAML. |
| [[agentskit-example-ink]] | Chat no terminal com Ink e memória em arquivo. |
| [[agentskit-example-multi-agent]] | App React com `useChat` e a skill `planner`. |
| [[agentskit-example-rag-chat]] | Chat com RAG sobre um corpus pequeno em Markdown. |
| [[agentskit-example-react]] | Chat React com OpenAI (se houver chave) ou demo, e memória em `localStorage`. |
| [[agentskit-example-runtime]] | Demos headless do runtime, com adapter simulado. |
| [[agentskit-example-slack-bot]] | Bot de Slack de referência, com `createChatTrigger`. Tem testes. |
| [[agentskit-example-teams-bot]] | Bot de Microsoft Teams de referência, com `createChatTrigger`. Tem testes. |
| [[agentskit-example-webllm]] | Chat que roda no navegador via WebGPU. |

Exemplos com teste próprio: apenas discord-bot, slack-bot e teams-bot (`tests/adapter.test.ts`). Os demais declaram só `lint`, e alguns `dev`/`build`.

Parte de um host de exemplo, não de workspace próprio: `apps/example-embedded/raycast/` tem `package.json` próprio, fora do `pnpm --filter @agentskit/example-embedded` (ver [[agentskit-example-embedded-raycast]]).

> [!info]- Detalhe técnico
> Índice Doc Bridge: `.doc-bridge/index.json` (`generatedAt` 2026-10-12); `doc-bridge.config.json` declara corpus de documentação e CLI.
