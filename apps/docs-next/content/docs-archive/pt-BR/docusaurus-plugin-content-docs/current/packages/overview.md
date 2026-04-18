---
sidebar_position: 1
title: Visão geral dos pacotes
description: Os quatorze pacotes npm do AgentsKit — propósito, nomes de instalação e links canônicos da documentação.
---

# Visão geral dos pacotes

Quatorze pacotes focados sob `@agentskit/*`. Instale o que precisar; as camadas de UI e runtime compartilham **`@agentskit/core`** (sem dependências de terceiros no core).

:::tip Referência da API

Assinaturas completas: **[TypeDoc HTML](pathname:///agentskit/api-reference/)** (gerado em `pnpm --filter @agentskit/docs build`; para desenvolvimento local, execute `pnpm --filter @agentskit/docs docs:api` uma vez).

:::

## Índice de pacotes

| Pacote | Papel | Guia |
|---------|------|--------|
| [`@agentskit/core`](./core) | Tipos, controlador de chat, primitivas, loop de agente | [Core](./core) |
| [`@agentskit/react`](../chat-uis/react) | Hooks React + UI headless | [React](../chat-uis/react) |
| [`@agentskit/ink`](../chat-uis/ink) | UI no terminal (Ink) | [Ink](../chat-uis/ink) |
| [`@agentskit/adapters`](../data-layer/adapters) | Adaptadores LLM + embedders | [Adaptadores](../data-layer/adapters) |
| [`@agentskit/memory`](../data-layer/memory) | Backends de chat + vetor | [Memória](../data-layer/memory) |
| [`@agentskit/rag`](../data-layer/rag) | Fragmentar, embedar, recuperar | [RAG](../data-layer/rag) |
| [`@agentskit/runtime`](../agents/runtime) | Runtime ReAct headless | [Runtime](../agents/runtime) |
| [`@agentskit/tools`](../agents/tools) | Ferramentas de busca, sistema de arquivos, shell | [Ferramentas](../agents/tools) |
| [`@agentskit/skills`](../agents/skills) | Definições de skills embutidas | [Skills](../agents/skills) |
| [`@agentskit/observability`](../infrastructure/observability) | Observadores de log + tracing | [Observabilidade](../infrastructure/observability) |
| [`@agentskit/sandbox`](../infrastructure/sandbox) | Execução de código em sandbox | [Sandbox](../infrastructure/sandbox) |
| [`@agentskit/eval`](../infrastructure/eval) | Suítes de eval + métricas de CI | [Eval](../infrastructure/eval) |
| [`@agentskit/cli`](../infrastructure/cli) | CLI `agentskit` | [CLI](../infrastructure/cli) |
| [`@agentskit/templates`](./templates) | Scaffolding de ferramentas, skills e adaptadores | [Templates](./templates) |

Mantenedores: **[checklist de documentação](../contributing/package-docs)**.
